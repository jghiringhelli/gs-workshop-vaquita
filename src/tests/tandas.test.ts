import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../index.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { TandaRepository } from '../repositories/TandaRepository.js';
import { ParticipantRepository } from '../repositories/ParticipantRepository.js';
import { ContributionRepository } from '../repositories/ContributionRepository.js';
import { UserService } from '../services/UserService.js';
import { TandaService } from '../services/TandaService.js';
import { getDatabase, closeDatabase } from '../db/database.js';
import { runMigrations } from '../db/schema.js';

let app: Express;

beforeEach(() => {
  process.env['DB_PATH'] = ':memory:';
  closeDatabase();
  const db = getDatabase();
  runMigrations();
  const userRepo = new UserRepository(db);
  const tandaRepo = new TandaRepository(db);
  const participantRepo = new ParticipantRepository(db);
  const contributionRepo = new ContributionRepository(db);
  const userService = new UserService(userRepo);
  const tandaService = new TandaService(tandaRepo, participantRepo, contributionRepo, userRepo);
  app = createApp(userService, tandaService);
});

afterEach(() => {
  closeDatabase();
});

/** Create a user via the API and return the id. */
async function createUser(
  email: string,
  name: string,
): Promise<string> {
  const res = await request(app).post('/api/users').send({ email, name });
  return (res.body as { id: string }).id;
}

/** Create a tanda and return { tandaId, organizerParticipantId }. */
async function createTanda(
  organizerId: string,
  contributionAmount = 1000,
): Promise<{ tandaId: string }> {
  const res = await request(app).post('/api/tandas').send({
    name: 'Test Tanda',
    organizerId,
    contributionAmount,
  });
  return { tandaId: (res.body as { id: string }).id };
}

/** Build a 3-participant tanda in FORMING status. Returns ids. */
async function buildFormingTanda(): Promise<{
  tandaId: string;
  organizerId: string;
  user2Id: string;
  user3Id: string;
}> {
  const organizerId = await createUser('org@example.com', 'Organizer');
  const user2Id = await createUser('user2@example.com', 'User2');
  const user3Id = await createUser('user3@example.com', 'User3');
  const { tandaId } = await createTanda(organizerId);
  await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: user2Id });
  await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: user3Id });
  return { tandaId, organizerId, user2Id, user3Id };
}

describe('POST /api/tandas', () => {
  it('creates a tanda and auto-joins organizer, returns 201', async () => {
    const organizerId = await createUser('org@example.com', 'Organizer');
    const res = await request(app).post('/api/tandas').send({
      name: 'Tanda Enero',
      organizerId,
      contributionAmount: 1000,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Tanda Enero', status: 'forming' });

    const participants = await request(app).get(`/api/tandas/${res.body.id}/participants`);
    expect(participants.body).toHaveLength(1);
    expect((participants.body as Array<{ role: string }>)[0]?.role).toBe('organizer');
  });
});

describe('POST /api/tandas/:id/join', () => {
  it('adds a member and returns 201', async () => {
    const organizerId = await createUser('org@example.com', 'Organizer');
    const memberId = await createUser('member@example.com', 'Member');
    const { tandaId } = await createTanda(organizerId);

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: memberId });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ userId: memberId, role: 'member' });
  });

  it('returns 409 when tanda is already ACTIVE', async () => {
    const { tandaId, organizerId } = await buildFormingTanda();
    await request(app).post(`/api/tandas/${tandaId}/start`).send({ requesterId: organizerId });

    const newUserId = await createUser('late@example.com', 'Late');
    const res = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: newUserId });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/tandas/:id/start', () => {
  it('starts with 3 participants and returns 200 + status=active', async () => {
    const { tandaId, organizerId } = await buildFormingTanda();
    const res = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .send({ requesterId: organizerId });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'active', totalRounds: 3, currentRound: 1 });
  });

  it('returns 400 with fewer than 3 participants', async () => {
    const organizerId = await createUser('org@example.com', 'Organizer');
    const user2Id = await createUser('u2@example.com', 'U2');
    const { tandaId } = await createTanda(organizerId);
    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: user2Id });

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .send({ requesterId: organizerId });
    expect(res.status).toBe(400);
  });

  it('returns 403 when caller is not the organizer', async () => {
    const { tandaId, user2Id } = await buildFormingTanda();
    const res = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .send({ requesterId: user2Id });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/tandas/:id/contributions', () => {
  it('records a contribution and returns 201', async () => {
    const { tandaId, organizerId } = await buildFormingTanda();
    await request(app).post(`/api/tandas/${tandaId}/start`).send({ requesterId: organizerId });

    const participants = await request(app).get(`/api/tandas/${tandaId}/participants`);
    const firstParticipant = (participants.body as Array<{ id: string }>)[0];
    expect(firstParticipant).toBeDefined();

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: firstParticipant!.id, amount: 1000 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ amount: 1000, status: 'paid', round: 1 });
  });

  it('returns 400 for wrong amount', async () => {
    const { tandaId, organizerId } = await buildFormingTanda();
    await request(app).post(`/api/tandas/${tandaId}/start`).send({ requesterId: organizerId });

    const participants = await request(app).get(`/api/tandas/${tandaId}/participants`);
    const firstParticipant = (participants.body as Array<{ id: string }>)[0];
    expect(firstParticipant).toBeDefined();

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: firstParticipant!.id, amount: 500 });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/tandas/:id/advance', () => {
  it('advances the round and returns 200', async () => {
    const { tandaId, organizerId } = await buildFormingTanda();
    await request(app).post(`/api/tandas/${tandaId}/start`).send({ requesterId: organizerId });

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .send({ requesterId: organizerId });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ currentRound: 2, status: 'active' });
  });

  it('auto-completes on the last round and returns 200 + status=completed', async () => {
    const { tandaId, organizerId } = await buildFormingTanda();
    await request(app).post(`/api/tandas/${tandaId}/start`).send({ requesterId: organizerId });

    // Advance through all 3 rounds (totalRounds=3, so 3 advances complete it)
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ requesterId: organizerId });
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ requesterId: organizerId });
    const res = await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .send({ requesterId: organizerId });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'completed' });
  });
});

describe('GET /api/tandas/:id/rounds/:round', () => {
  it('returns 200 with round summary including contributions', async () => {
    const { tandaId, organizerId } = await buildFormingTanda();
    await request(app).post(`/api/tandas/${tandaId}/start`).send({ requesterId: organizerId });

    const participants = await request(app).get(`/api/tandas/${tandaId}/participants`);
    const firstParticipant = (participants.body as Array<{ id: string }>)[0];
    expect(firstParticipant).toBeDefined();
    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ participantId: firstParticipant!.id, amount: 1000 });

    const res = await request(app).get(`/api/tandas/${tandaId}/rounds/1`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ round: 1 });
    expect(Array.isArray(res.body.contributions)).toBe(true);
    expect((res.body.contributions as unknown[]).length).toBeGreaterThanOrEqual(1);
  });
});

describe('POST /api/tandas/:id/cancel', () => {
  it('cancels a tanda and returns 200 + status=cancelled', async () => {
    const organizerId = await createUser('org@example.com', 'Organizer');
    const { tandaId } = await createTanda(organizerId);

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/cancel`)
      .send({ requesterId: organizerId });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'cancelled' });
  });
});
