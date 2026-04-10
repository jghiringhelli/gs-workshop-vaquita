import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { createApp } from '../app';
import { createDatabase } from '../db/database';
import { UserRepository } from '../users/user.repository';
import { UserService } from '../users/user.service';
import { createUserRouter } from '../users/user.routes';
import { TandaRepository } from './tanda.repository';
import { TandaService } from './tanda.service';
import { createTandaRouter } from './tanda.routes';
import { ParticipantRepository } from '../participants/participant.repository';
import { ParticipantService } from '../participants/participant.service';
import { createParticipantRouter } from '../participants/participant.routes';
import { ContributionRepository } from '../contributions/contribution.repository';
import { ContributionService } from '../contributions/contribution.service';
import { createContributionRouter } from '../contributions/contribution.routes';

function buildTestApp(opts: { minParticipantsToStart?: number } = {}): Application {
  const db = createDatabase(':memory:');

  const userRepo = new UserRepository(db);
  const userService = new UserService(userRepo);

  const participantRepo = new ParticipantRepository(db);
  const tandaRepo = new TandaRepository(db);
  const tandaService = new TandaService(tandaRepo, participantRepo, userRepo, {
    minParticipantsToStart: opts.minParticipantsToStart ?? 3,
  });
  const participantService = new ParticipantService(tandaRepo, participantRepo, userRepo, {
    maxParticipants: 20,
  });
  const contributionRepo = new ContributionRepository(db);
  const contributionService = new ContributionService(tandaRepo, participantRepo, contributionRepo);

  return createApp([
    { path: '/api/users', router: createUserRouter(userService) },
    { path: '/api/tandas', router: createTandaRouter(tandaService) },
    { path: '/api/tandas', router: createParticipantRouter(participantService) },
    { path: '/api/tandas', router: createContributionRouter(contributionService) },
  ]);
}

/** Helper: create a user and return its id */
async function createUser(app: Application, email = 'alice@example.com', name = 'Alice'): Promise<string> {
  const res = await request(app).post('/api/users').send({ email, name });
  return (res.body.data as { id: string }).id;
}

describe('POST /api/tandas', () => {
  let app: Application;

  beforeEach(() => {
    app = buildTestApp();
  });

  it('creates a tanda and returns 201 with the tanda DTO', async () => {
    const userId = await createUser(app);

    const res = await request(app).post('/api/tandas').send({
      name: 'Tanda Enero',
      organizerId: userId,
      contributionAmount: 1000,
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'Tanda Enero',
      organizerId: userId,
      contributionAmount: 1000,
      status: 'forming',
      currentRound: 1,
      totalRounds: 0,
    });
    expect(typeof res.body.data.id).toBe('string');
    expect(typeof res.body.data.createdAt).toBe('string');
  });

  it('auto-joins the organizer — tanda appears in their list after creation', async () => {
    const userId = await createUser(app);

    await request(app).post('/api/tandas').send({
      name: 'Tanda Enero',
      organizerId: userId,
      contributionAmount: 1000,
    });

    const list = await request(app).get(`/api/tandas?userId=${userId}`);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].name).toBe('Tanda Enero');
  });

  it('returns 422 when name is missing', async () => {
    const userId = await createUser(app);

    const res = await request(app).post('/api/tandas').send({
      organizerId: userId,
      contributionAmount: 1000,
    });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe('name');
  });

  it('returns 422 when organizerId is not a valid UUID', async () => {
    const res = await request(app).post('/api/tandas').send({
      name: 'Tanda Enero',
      organizerId: 'not-a-uuid',
      contributionAmount: 1000,
    });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe('organizerId');
  });

  it('returns 422 when contributionAmount is missing', async () => {
    const userId = await createUser(app);

    const res = await request(app).post('/api/tandas').send({
      name: 'Tanda Enero',
      organizerId: userId,
    });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe('contributionAmount');
  });

  it('returns 422 when contributionAmount is zero or negative', async () => {
    const userId = await createUser(app);

    const res = await request(app).post('/api/tandas').send({
      name: 'Tanda Enero',
      organizerId: userId,
      contributionAmount: -100,
    });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe('contributionAmount');
  });

  it('returns 404 when organizerId does not reference an existing user', async () => {
    const res = await request(app).post('/api/tandas').send({
      name: 'Tanda Enero',
      organizerId: '00000000-0000-0000-0000-000000000000',
      contributionAmount: 1000,
    });

    expect(res.status).toBe(404);
    expect(res.body.errors[0].code).toBe('NOT_FOUND');
  });
});

describe('GET /api/tandas', () => {
  let app: Application;

  beforeEach(() => {
    app = buildTestApp();
  });

  it('returns 200 with empty list when user has no tandas', async () => {
    const userId = await createUser(app);

    const res = await request(app).get(`/api/tandas?userId=${userId}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  it('returns only tandas the user participates in', async () => {
    const aliceId = await createUser(app, 'alice@example.com', 'Alice');
    const bobId = await createUser(app, 'bob@example.com', 'Bob');

    await request(app).post('/api/tandas').send({ name: 'Alice Tanda', organizerId: aliceId, contributionAmount: 500 });
    await request(app).post('/api/tandas').send({ name: 'Bob Tanda', organizerId: bobId, contributionAmount: 200 });

    const res = await request(app).get(`/api/tandas?userId=${aliceId}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Alice Tanda');
    expect(res.body.meta.total).toBe(1);
  });

  it('returns 422 when userId query param is missing', async () => {
    const res = await request(app).get('/api/tandas');

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe('userId');
  });
});

describe('GET /api/tandas/:id', () => {
  let app: Application;

  beforeEach(() => {
    app = buildTestApp();
  });

  it('returns 200 with the tanda when found', async () => {
    const userId = await createUser(app);

    const created = await request(app).post('/api/tandas').send({
      name: 'Tanda Febrero',
      organizerId: userId,
      contributionAmount: 750,
    });

    const { id } = created.body.data as { id: string };
    const res = await request(app).get(`/api/tandas/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
    expect(res.body.data.name).toBe('Tanda Febrero');
    expect(res.body.data.contributionAmount).toBe(750);
  });

  it('returns 404 with NOT_FOUND code when tanda does not exist', async () => {
    const res = await request(app).get('/api/tandas/00000000-0000-0000-0000-000000000000');

    expect(res.status).toBe(404);
    expect(res.body.errors[0].code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// Helper: build a tanda with N extra participants (organizer + N members)
// ---------------------------------------------------------------------------
async function buildTandaWithParticipants(
  app: Application,
  extraCount: number,
): Promise<{ tandaId: string; organizerId: string }> {
  const organizerId = await createUser(app, 'org@example.com', 'Organizer');
  const res = await request(app).post('/api/tandas').send({
    name: 'Test Tanda',
    organizerId,
    contributionAmount: 500,
  });
  const tandaId = (res.body.data as { id: string }).id;

  for (let i = 0; i < extraCount; i++) {
    const memberId = await createUser(app, `member${i}@example.com`, `Member${i}`);
    await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: memberId });
  }

  return { tandaId, organizerId };
}

describe('POST /api/tandas/:id/start', () => {
  it('returns 404 when tanda does not exist', async () => {
    const app = buildTestApp();
    const organizerId = await createUser(app);
    const res = await request(app)
      .post('/api/tandas/00000000-0000-0000-0000-000000000000/start')
      .send({ requesterId: organizerId });

    expect(res.status).toBe(404);
    expect(res.body.errors[0].code).toBe('NOT_FOUND');
  });

  it('returns 403 when requester is not the organizer', async () => {
    const app = buildTestApp();
    const { tandaId } = await buildTandaWithParticipants(app, 2);
    const otherId = await createUser(app, 'other@example.com', 'Other');

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .send({ requesterId: otherId });

    expect(res.status).toBe(403);
    expect(res.body.errors[0].code).toBe('FORBIDDEN');
  });

  it('returns 409 when tanda is not in forming status', async () => {
    const app = buildTestApp();
    const { tandaId, organizerId } = await buildTandaWithParticipants(app, 2);
    // Force non-forming via a first start, then try again
    await request(app).post(`/api/tandas/${tandaId}/start`).send({ requesterId: organizerId });

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .send({ requesterId: organizerId });

    expect(res.status).toBe(409);
    expect(res.body.errors[0].code).toBe('CONFLICT');
  });

  it('returns 409 when there are fewer than minParticipants', async () => {
    // minParticipantsToStart=4 but tanda has only 3 (organizer + 2 members)
    const app = buildTestApp({ minParticipantsToStart: 4 });
    const { tandaId, organizerId } = await buildTandaWithParticipants(app, 2);

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .send({ requesterId: organizerId });

    expect(res.status).toBe(409);
    expect(res.body.errors[0].code).toBe('CONFLICT');
  });

  it('returns 200 and active tanda on success', async () => {
    const app = buildTestApp();
    const { tandaId, organizerId } = await buildTandaWithParticipants(app, 2);

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .send({ requesterId: organizerId });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.totalRounds).toBe(3); // organizer + 2 members
  });

  it('assigns each participant a unique rotationPosition from 1 to N', async () => {
    const app = buildTestApp();
    const { tandaId, organizerId } = await buildTandaWithParticipants(app, 4); // 5 total

    await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .send({ requesterId: organizerId });

    const partRes = await request(app).get(`/api/tandas/${tandaId}/participants`);
    const positions = (partRes.body.data as Array<{ rotationPosition: number }>)
      .map((p) => p.rotationPosition)
      .sort((a, b) => a - b);

    expect(positions).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('POST /api/tandas/:id/cancel', () => {
  it('returns 404 when tanda does not exist', async () => {
    const app = buildTestApp();
    const userId = await createUser(app);
    const res = await request(app)
      .post('/api/tandas/00000000-0000-0000-0000-000000000000/cancel')
      .send({ requesterId: userId });

    expect(res.status).toBe(404);
    expect(res.body.errors[0].code).toBe('NOT_FOUND');
  });

  it('returns 403 when requester is not the organizer', async () => {
    const app = buildTestApp();
    const { tandaId } = await buildTandaWithParticipants(app, 0);
    const otherId = await createUser(app, 'intruder@example.com', 'Intruder');

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/cancel`)
      .send({ requesterId: otherId });

    expect(res.status).toBe(403);
    expect(res.body.errors[0].code).toBe('FORBIDDEN');
  });

  it('returns 409 when tanda is already cancelled', async () => {
    const app = buildTestApp();
    const { tandaId, organizerId } = await buildTandaWithParticipants(app, 0);
    await request(app).post(`/api/tandas/${tandaId}/cancel`).send({ requesterId: organizerId });

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/cancel`)
      .send({ requesterId: organizerId });

    expect(res.status).toBe(409);
    expect(res.body.errors[0].code).toBe('CONFLICT');
  });

  it('returns 200 and cancelled status when tanda is forming', async () => {
    const app = buildTestApp();
    const { tandaId, organizerId } = await buildTandaWithParticipants(app, 0);

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/cancel`)
      .send({ requesterId: organizerId });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('returns 200 and cancelled status when tanda is active', async () => {
    const app = buildTestApp();
    const { tandaId, organizerId } = await buildTandaWithParticipants(app, 2);
    // Start first so it's active
    await request(app).post(`/api/tandas/${tandaId}/start`).send({ requesterId: organizerId });

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/cancel`)
      .send({ requesterId: organizerId });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });
});

describe('POST /api/tandas/:id/advance', () => {
  it('returns 404 when tanda does not exist', async () => {
    const app = buildTestApp();
    const userId = await createUser(app);
    const res = await request(app)
      .post('/api/tandas/00000000-0000-0000-0000-000000000000/advance')
      .send({ requesterId: userId });

    expect(res.status).toBe(404);
    expect(res.body.errors[0].code).toBe('NOT_FOUND');
  });

  it('returns 403 when requester is not the organizer', async () => {
    const app = buildTestApp();
    const { tandaId } = await buildTandaWithParticipants(app, 2);
    const organizerId = (
      await request(app).get(`/api/tandas/${tandaId}`)
    ).body.data.organizerId as string;
    await request(app).post(`/api/tandas/${tandaId}/start`).send({ requesterId: organizerId });
    const otherId = await createUser(app, 'intruder@example.com', 'Intruder');

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .send({ requesterId: otherId });

    expect(res.status).toBe(403);
    expect(res.body.errors[0].code).toBe('FORBIDDEN');
  });

  it('returns 409 when tanda is not active (forming)', async () => {
    const app = buildTestApp();
    const { tandaId } = await buildTandaWithParticipants(app, 2);
    const organizerId = (
      await request(app).get(`/api/tandas/${tandaId}`)
    ).body.data.organizerId as string;

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .send({ requesterId: organizerId });

    expect(res.status).toBe(409);
    expect(res.body.errors[0].code).toBe('CONFLICT');
  });

  it('returns 409 when tanda is already completed', async () => {
    // Use minParticipantsToStart=2 so a 2-person tanda can start
    const app = buildTestApp({ minParticipantsToStart: 2 });
    const { tandaId } = await buildTandaWithParticipants(app, 1); // 2 total (organizer + 1)
    const organizerId = (
      await request(app).get(`/api/tandas/${tandaId}`)
    ).body.data.organizerId as string;
    await request(app).post(`/api/tandas/${tandaId}/start`).send({ requesterId: organizerId });
    // Advance twice to exhaust both rounds → auto-complete
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ requesterId: organizerId });
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ requesterId: organizerId });

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .send({ requesterId: organizerId });

    expect(res.status).toBe(409);
    expect(res.body.errors[0].code).toBe('CONFLICT');
  });

  it('advances from round 1 to 2 and keeps status active', async () => {
    const app = buildTestApp();
    const { tandaId } = await buildTandaWithParticipants(app, 2); // 3 total
    const organizerId = (
      await request(app).get(`/api/tandas/${tandaId}`)
    ).body.data.organizerId as string;
    await request(app).post(`/api/tandas/${tandaId}/start`).send({ requesterId: organizerId });

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .send({ requesterId: organizerId });

    expect(res.status).toBe(200);
    expect(res.body.data.currentRound).toBe(2);
    expect(res.body.data.status).toBe('active');
  });

  it('auto-completes on the last round advance — status becomes completed', async () => {
    // 2 participants, 2 rounds total
    const app = buildTestApp({ minParticipantsToStart: 2 });
    const { tandaId } = await buildTandaWithParticipants(app, 1);
    const organizerId = (
      await request(app).get(`/api/tandas/${tandaId}`)
    ).body.data.organizerId as string;
    await request(app).post(`/api/tandas/${tandaId}/start`).send({ requesterId: organizerId });
    // Advance to round 2 (still active)
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ requesterId: organizerId });
    // Advance past totalRounds (round 3 > totalRounds 2) → completed
    const res = await request(app)
      .post(`/api/tandas/${tandaId}/advance`)
      .send({ requesterId: organizerId });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.currentRound).toBe(3);
  });

  it('completed tanda cannot accept new contributions (end-to-end auto-complete proof)', async () => {
    const app = buildTestApp({ minParticipantsToStart: 2 });
    const { tandaId } = await buildTandaWithParticipants(app, 1);
    const organizerId = (
      await request(app).get(`/api/tandas/${tandaId}`)
    ).body.data.organizerId as string;
    await request(app).post(`/api/tandas/${tandaId}/start`).send({ requesterId: organizerId });
    // Exhaust all rounds
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ requesterId: organizerId });
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ requesterId: organizerId });

    // Verify status is completed
    const tandaRes = await request(app).get(`/api/tandas/${tandaId}`);
    expect(tandaRes.body.data.status).toBe('completed');

    // Try to record a contribution — must be rejected
    const contribRes = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ userId: organizerId, amount: 500 });
    expect(contribRes.status).toBe(409);
    expect(contribRes.body.errors[0].code).toBe('CONFLICT');
  });
});


