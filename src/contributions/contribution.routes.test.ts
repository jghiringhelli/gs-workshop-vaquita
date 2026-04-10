import { describe, it, expect } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { createApp } from '../app';
import { createDatabase } from '../db/database';
import { UserRepository } from '../repositories/user.repository';
import { UserService } from '../users/user.service';
import { createUserRouter } from '../users/user.routes';
import { TandaRepository } from '../repositories/tanda.repository';
import { TandaService } from '../tandas/tanda.service';
import { createTandaRouter } from '../tandas/tanda.routes';
import { ParticipantRepository } from '../repositories/participant.repository';
import { ParticipantService } from '../participants/participant.service';
import { createParticipantRouter } from '../participants/participant.routes';
import { ContributionRepository } from '../repositories/contribution.repository';
import { ContributionService } from './contribution.service';
import { createContributionRouter } from './contribution.routes';

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

/** Creates a user and returns its id. */
async function createUser(
  app: Application,
  email = 'alice@example.com',
  name = 'Alice',
): Promise<string> {
  const res = await request(app).post('/api/users').send({ email, name });
  return (res.body.data as { id: string }).id;
}

/** Monotonically increasing counter for unique emails within a test run. */
let _seq = 0;

/**
 * Creates a tanda with `extraMembers` additional participants (beyond the organizer),
 * then starts it. Returns tandaId, organizerId, and all memberIds.
 * Uses a sequence counter so each call gets unique email addresses — safe to call
 * multiple times on the same app instance.
 */
async function buildActiveTanda(
  app: Application,
  extraMembers = 2,
): Promise<{ tandaId: string; organizerId: string; memberIds: string[] }> {
  const seq = ++_seq;
  const organizerId = await createUser(app, `organizer${seq}@example.com`, `Organizer${seq}`);
  const res = await request(app)
    .post('/api/tandas')
    .send({ name: `Test Tanda ${seq}`, organizerId, contributionAmount: 500 });
  const tandaId = (res.body.data as { id: string }).id;

  const memberIds: string[] = [];
  for (let i = 0; i < extraMembers; i++) {
    const memberId = await createUser(app, `member${seq}_${i}@example.com`, `Member${seq}_${i}`);
    await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: memberId });
    memberIds.push(memberId);
  }

  await request(app).post(`/api/tandas/${tandaId}/start`).send({ requesterId: organizerId });

  return { tandaId, organizerId, memberIds };
}

// ---------------------------------------------------------------------------
// POST /api/tandas/:tandaId/contributions
// ---------------------------------------------------------------------------

describe('POST /api/tandas/:tandaId/contributions', () => {
  it('returns 404 when tanda does not exist', async () => {
    const app = buildTestApp();
    const userId = await createUser(app);

    const res = await request(app)
      .post('/api/tandas/00000000-0000-0000-0000-000000000000/contributions')
      .send({ userId, amount: 500 });

    expect(res.status).toBe(404);
    expect(res.body.errors[0].code).toBe('NOT_FOUND');
  });

  it('returns 409 when tanda is not active (forming)', async () => {
    const app = buildTestApp();
    const organizerId = await createUser(app, 'org@example.com', 'Org');
    const createRes = await request(app)
      .post('/api/tandas')
      .send({ name: 'Forming Tanda', organizerId, contributionAmount: 500 });
    const tandaId = (createRes.body.data as { id: string }).id;

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ userId: organizerId, amount: 500 });

    expect(res.status).toBe(409);
    expect(res.body.errors[0].code).toBe('CONFLICT');
  });

  it('returns 404 when user is not a participant in the tanda', async () => {
    const app = buildTestApp();
    const { tandaId } = await buildActiveTanda(app);
    const outsiderId = await createUser(app, 'outsider@example.com', 'Outsider');

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ userId: outsiderId, amount: 500 });

    expect(res.status).toBe(404);
    expect(res.body.errors[0].code).toBe('NOT_FOUND');
  });

  it('returns 422 when amount does not match contributionAmount', async () => {
    const app = buildTestApp();
    const { tandaId, organizerId } = await buildActiveTanda(app);

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ userId: organizerId, amount: 999 });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when participant already contributed this round', async () => {
    const app = buildTestApp();
    const { tandaId, organizerId } = await buildActiveTanda(app);

    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ userId: organizerId, amount: 500 });

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ userId: organizerId, amount: 500 });

    expect(res.status).toBe(409);
    expect(res.body.errors[0].code).toBe('CONFLICT');
  });

  it('returns 201 with ContributionResponseDTO on success', async () => {
    const app = buildTestApp();
    const { tandaId, organizerId } = await buildActiveTanda(app);

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ userId: organizerId, amount: 500 });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      tandaId,
      round: 1,
      amount: 500,
      status: 'paid',
    });
    expect(typeof res.body.data.id).toBe('string');
    expect(typeof res.body.data.participantId).toBe('string');
    expect(typeof res.body.data.createdAt).toBe('string');
  });

  it('returns 422 when body is missing required fields', async () => {
    const app = buildTestApp();
    const { tandaId } = await buildActiveTanda(app);

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({});

    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// GET /api/tandas/:id/rounds/:round
// ---------------------------------------------------------------------------

describe('GET /api/tandas/:id/rounds/:round', () => {
  it('returns 404 when tanda does not exist', async () => {
    const app = buildTestApp();

    const res = await request(app).get(
      '/api/tandas/00000000-0000-0000-0000-000000000000/rounds/1',
    );

    expect(res.status).toBe(404);
    expect(res.body.errors[0].code).toBe('NOT_FOUND');
  });

  it('returns 422 when round param is not a positive integer', async () => {
    const app = buildTestApp();
    const { tandaId } = await buildActiveTanda(app);

    const res = await request(app).get(`/api/tandas/${tandaId}/rounds/abc`);

    expect(res.status).toBe(422);
  });

  it('returns empty paid list and all participants pending when no contributions yet', async () => {
    const app = buildTestApp();
    const { tandaId } = await buildActiveTanda(app, 2); // 3 participants total

    const res = await request(app).get(`/api/tandas/${tandaId}/rounds/1`);

    expect(res.status).toBe(200);
    expect(res.body.data.round).toBe(1);
    expect(res.body.data.totalCollected).toBe(0);
    expect(res.body.data.paid).toHaveLength(0);
    expect(res.body.data.pending).toHaveLength(3);
  });

  it('reflects paid and pending correctly as contributions come in', async () => {
    const app = buildTestApp();
    const { tandaId, organizerId, memberIds } = await buildActiveTanda(app, 2);

    // Organizer and first member pay
    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ userId: organizerId, amount: 500 });
    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ userId: memberIds[0]!, amount: 500 });

    const res = await request(app).get(`/api/tandas/${tandaId}/rounds/1`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalCollected).toBe(1000);
    expect(res.body.data.paid).toHaveLength(2);
    expect(res.body.data.pending).toHaveLength(1); // second member hasn't paid
  });

  it('returns totalCollected equal to N × contributionAmount when everyone paid', async () => {
    const app = buildTestApp();
    const { tandaId, organizerId, memberIds } = await buildActiveTanda(app, 2); // 3 total

    for (const userId of [organizerId, ...memberIds]) {
      await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({ userId, amount: 500 });
    }

    const res = await request(app).get(`/api/tandas/${tandaId}/rounds/1`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalCollected).toBe(1500);
    expect(res.body.data.paid).toHaveLength(3);
    expect(res.body.data.pending).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// GET /api/tandas/:id/participants/:pid/history
// ---------------------------------------------------------------------------

describe('GET /api/tandas/:id/participants/:pid/history', () => {
  it('returns 404 when tanda does not exist', async () => {
    const app = buildTestApp();
    const res = await request(app).get(
      '/api/tandas/00000000-0000-0000-0000-000000000000/participants/00000000-0000-0000-0000-000000000001/history',
    );

    expect(res.status).toBe(404);
    expect(res.body.errors[0].code).toBe('NOT_FOUND');
  });

  it('returns 404 when participant belongs to a different tanda', async () => {
    const app = buildTestApp();
    // Build two separate active tandas
    const { tandaId: tandaA } = await buildActiveTanda(app, 2);
    const { tandaId: tandaB } = await buildActiveTanda(app, 2);

    // Get a participant from tanda B
    const partBRes = await request(app).get(`/api/tandas/${tandaB}/participants`);
    const pidFromB = (partBRes.body.data as Array<{ id: string }>)[0]!.id;

    // Try to look up that participant under tanda A
    const res = await request(app).get(
      `/api/tandas/${tandaA}/participants/${pidFromB}/history`,
    );

    expect(res.status).toBe(404);
    expect(res.body.errors[0].code).toBe('NOT_FOUND');
  });

  it('returns empty array when participant has no contributions yet', async () => {
    const app = buildTestApp();
    const { tandaId } = await buildActiveTanda(app, 2);
    const partRes = await request(app).get(`/api/tandas/${tandaId}/participants`);
    const pid = (partRes.body.data as Array<{ id: string }>)[0]!.id;

    const res = await request(app).get(`/api/tandas/${tandaId}/participants/${pid}/history`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns contributions ordered by round for a participant with multiple contributions', async () => {
    const app = buildTestApp({ minParticipantsToStart: 2 });
    // 2 participants so we can advance through 2 rounds
    const { tandaId, organizerId } = await buildActiveTanda(app, 1);

    // Get the organizer's participantId
    const partRes = await request(app).get(`/api/tandas/${tandaId}/participants`);
    const orgParticipant = (partRes.body.data as Array<{ id: string; userId: string }>).find(
      (p) => p.userId === organizerId,
    )!;

    // Round 1: organizer pays
    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ userId: organizerId, amount: 500 });

    // Advance to round 2
    await request(app).post(`/api/tandas/${tandaId}/advance`).send({ requesterId: organizerId });

    // Round 2: organizer pays again
    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .send({ userId: organizerId, amount: 500 });

    const res = await request(app).get(
      `/api/tandas/${tandaId}/participants/${orgParticipant.id}/history`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].round).toBe(1);
    expect(res.body.data[1].round).toBe(2);
    expect(res.body.data[0].status).toBe('paid');
    expect(res.body.data[1].status).toBe('paid');
    expect(res.body.data[0].participantId).toBe(orgParticipant.id);
  });
});

