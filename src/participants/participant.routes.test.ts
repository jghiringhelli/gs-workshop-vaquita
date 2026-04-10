import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import Database from 'better-sqlite3';
import { createApp } from '../app';
import { createDatabase } from '../db/database';
import { UserRepository } from '../users/user.repository';
import { UserService } from '../users/user.service';
import { createUserRouter } from '../users/user.routes';
import { TandaRepository } from '../tandas/tanda.repository';
import { TandaService } from '../tandas/tanda.service';
import { createTandaRouter } from '../tandas/tanda.routes';
import { ParticipantRepository } from './participant.repository';
import { ParticipantService } from './participant.service';
import { createParticipantRouter } from './participant.routes';

interface TestApp {
  app: Application;
  db: Database.Database;
}

function buildTestApp(opts: { maxParticipants?: number } = {}): TestApp {
  const db = createDatabase(':memory:');
  const maxParticipants = opts.maxParticipants ?? 20;

  const userRepo = new UserRepository(db);
  const userService = new UserService(userRepo);

  const participantRepo = new ParticipantRepository(db);
  const tandaRepo = new TandaRepository(db);
  const tandaService = new TandaService(tandaRepo, participantRepo, userRepo);
  const participantService = new ParticipantService(tandaRepo, participantRepo, userRepo, { maxParticipants });

  const app = createApp([
    { path: '/api/users', router: createUserRouter(userService) },
    { path: '/api/tandas', router: createTandaRouter(tandaService) },
    { path: '/api/tandas', router: createParticipantRouter(participantService) },
  ]);

  return { app, db };
}

/** Helper: create a user and return its id */
async function createUser(app: Application, email: string, name: string): Promise<string> {
  const res = await request(app).post('/api/users').send({ email, name });
  return (res.body.data as { id: string }).id;
}

/** Helper: create a tanda and return its id */
async function createTanda(app: Application, organizerId: string): Promise<string> {
  const res = await request(app)
    .post('/api/tandas')
    .send({ name: 'Test Tanda', organizerId, contributionAmount: 500 });
  return (res.body.data as { id: string }).id;
}

describe('POST /api/tandas/:id/join', () => {
  let app: Application;
  let db: Database.Database;

  beforeEach(() => {
    ({ app, db } = buildTestApp());
  });

  it('returns 201 and the participant DTO when join succeeds', async () => {
    const organizerId = await createUser(app, 'alice@example.com', 'Alice');
    const memberId = await createUser(app, 'bob@example.com', 'Bob');
    const tandaId = await createTanda(app, organizerId);

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: memberId });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      userId: memberId,
      tandaId,
      role: 'member',
      rotationPosition: null,
    });
    expect(typeof res.body.data.id).toBe('string');
  });

  it('returns 422 when userId is not a valid UUID', async () => {
    const organizerId = await createUser(app, 'alice@example.com', 'Alice');
    const tandaId = await createTanda(app, organizerId);

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: 'not-a-uuid' });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe('userId');
  });

  it('returns 404 when the tanda does not exist', async () => {
    const userId = await createUser(app, 'alice@example.com', 'Alice');

    const res = await request(app)
      .post('/api/tandas/00000000-0000-0000-0000-000000000000/join')
      .send({ userId });

    expect(res.status).toBe(404);
    expect(res.body.errors[0].code).toBe('NOT_FOUND');
  });

  it('returns 404 when the user does not exist', async () => {
    const organizerId = await createUser(app, 'alice@example.com', 'Alice');
    const tandaId = await createTanda(app, organizerId);

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(404);
    expect(res.body.errors[0].code).toBe('NOT_FOUND');
  });

  it('returns 409 when tanda is not in forming status', async () => {
    const organizerId = await createUser(app, 'alice@example.com', 'Alice');
    const memberId = await createUser(app, 'bob@example.com', 'Bob');
    const tandaId = await createTanda(app, organizerId);

    // Force tanda into a non-forming state directly via DB (no /start endpoint yet)
    db.prepare("UPDATE tandas SET status = 'active' WHERE id = ?").run(tandaId);

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: memberId });

    expect(res.status).toBe(409);
    expect(res.body.errors[0].code).toBe('CONFLICT');
    expect(res.body.errors[0].message).toContain('active');
  });

  it('returns 409 when user is already a participant (no raw SQL error)', async () => {
    const organizerId = await createUser(app, 'alice@example.com', 'Alice');
    const memberId = await createUser(app, 'bob@example.com', 'Bob');
    const tandaId = await createTanda(app, organizerId);

    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: memberId });

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: memberId });

    expect(res.status).toBe(409);
    expect(res.body.errors[0].code).toBe('CONFLICT');
  });

  it('returns 409 when tanda is at max participant capacity (using maxParticipants: 2)', async () => {
    // Use a low limit so we don't need to create 20 users
    ({ app } = buildTestApp({ maxParticipants: 2 }));

    const organizerId = await createUser(app, 'alice@example.com', 'Alice');
    const bobId = await createUser(app, 'bob@example.com', 'Bob');
    const charlieId = await createUser(app, 'charlie@example.com', 'Charlie');
    const tandaId = await createTanda(app, organizerId); // Alice auto-joined: count = 1

    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: bobId }); // count = 2 = max

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: charlieId }); // should be rejected

    expect(res.status).toBe(409);
    expect(res.body.errors[0].code).toBe('CONFLICT');
    expect(res.body.errors[0].message).toContain('maximum');
  });
});

describe('GET /api/tandas/:id/participants', () => {
  let app: Application;

  beforeEach(() => {
    ({ app } = buildTestApp());
  });

  it('returns 200 with organizer listed after tanda creation', async () => {
    const organizerId = await createUser(app, 'alice@example.com', 'Alice');
    const tandaId = await createTanda(app, organizerId);

    const res = await request(app).get(`/api/tandas/${tandaId}/participants`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].userId).toBe(organizerId);
    expect(res.body.data[0].role).toBe('organizer');
    expect(res.body.meta.total).toBe(1);
  });

  it('returns organizer and all members after joins', async () => {
    const organizerId = await createUser(app, 'alice@example.com', 'Alice');
    const bobId = await createUser(app, 'bob@example.com', 'Bob');
    const charlieId = await createUser(app, 'charlie@example.com', 'Charlie');
    const tandaId = await createTanda(app, organizerId);

    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: bobId });
    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: charlieId });

    const res = await request(app).get(`/api/tandas/${tandaId}/participants`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta.total).toBe(3);

    const roles = (res.body.data as { role: string }[]).map((p) => p.role);
    expect(roles).toContain('organizer');
    expect(roles.filter((r) => r === 'member')).toHaveLength(2);
  });

  it('returns 404 when the tanda does not exist', async () => {
    const res = await request(app).get(
      '/api/tandas/00000000-0000-0000-0000-000000000000/participants',
    );

    expect(res.status).toBe(404);
    expect(res.body.errors[0].code).toBe('NOT_FOUND');
  });
});
