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

  return createApp([
    { path: '/api/users', router: createUserRouter(userService) },
    { path: '/api/tandas', router: createTandaRouter(tandaService) },
    { path: '/api/tandas', router: createParticipantRouter(participantService) },
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
