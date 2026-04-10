import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app';
import { createDatabase, setDatabase, resetDatabase } from '../db/database';

let app: Express;

beforeEach(() => {
  setDatabase(createDatabase(':memory:'));
  app = createApp();
});

afterEach(() => {
  resetDatabase();
});

async function createUser(email: string, name: string) {
  const res = await request(app).post('/api/users').send({ email, name });
  return res.body as { id: string; email: string; name: string };
}

async function createTanda(organizerId: string, name = 'Tanda Test', amount = 1000) {
  const res = await request(app)
    .post('/api/tandas')
    .send({ name, organizerId, contributionAmount: amount });
  return res.body as { id: string; status: string };
}

async function setupActiveTanda() {
  const [org, m1, m2] = await Promise.all([
    createUser('org@test.com', 'Organizer'),
    createUser('m1@test.com', 'Member1'),
    createUser('m2@test.com', 'Member2'),
  ]);
  const tanda = await createTanda(org.id);

  await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
  await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
  await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: org.id });

  const partRes = await request(app).get(`/api/tandas/${tanda.id}/participants`);
  return { tanda, org, m1, m2, participants: partRes.body as Array<{ id: string }> };
}

// ── POST /api/tandas ─────────────────────────────────────────────────────────

describe('POST /api/tandas', () => {
  it('creates a tanda and auto-joins organizer', async () => {
    const org = await createUser('org@test.com', 'Org');
    const res = await request(app)
      .post('/api/tandas')
      .send({ name: 'Tanda Enero', organizerId: org.id, contributionAmount: 1000 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Tanda Enero',
      organizerId: org.id,
      contributionAmount: 1000,
      status: 'forming',
      currentRound: 0,
    });
  });

  it('returns 404 if organizer does not exist', async () => {
    const res = await request(app)
      .post('/api/tandas')
      .send({ name: 'T', organizerId: '00000000-0000-0000-0000-000000000000', contributionAmount: 100 });
    expect(res.status).toBe(404);
  });

  it('returns 400 for missing contributionAmount', async () => {
    const org = await createUser('org@test.com', 'Org');
    const res = await request(app)
      .post('/api/tandas')
      .send({ name: 'T', organizerId: org.id });
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative contributionAmount', async () => {
    const org = await createUser('org@test.com', 'Org');
    const res = await request(app)
      .post('/api/tandas')
      .send({ name: 'T', organizerId: org.id, contributionAmount: -50 });
    expect(res.status).toBe(400);
  });
});

// ── GET /api/tandas ───────────────────────────────────────────────────────────

describe('GET /api/tandas', () => {
  it('lists tandas for a user', async () => {
    const org = await createUser('org@test.com', 'Org');
    await createTanda(org.id, 'Tanda A');
    await createTanda(org.id, 'Tanda B');
    const res = await request(app).get(`/api/tandas?userId=${org.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('returns 400 if userId is missing', async () => {
    const res = await request(app).get('/api/tandas');
    expect(res.status).toBe(400);
  });
});

// ── GET /api/tandas/:id ───────────────────────────────────────────────────────

describe('GET /api/tandas/:id', () => {
  it('returns tanda by id', async () => {
    const org = await createUser('org@test.com', 'Org');
    const tanda = await createTanda(org.id);
    const res = await request(app).get(`/api/tandas/${tanda.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(tanda.id);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/tandas/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

// ── POST /api/tandas/:id/join ─────────────────────────────────────────────────

describe('POST /api/tandas/:id/join', () => {
  it('adds a new member', async () => {
    const [org, member] = await Promise.all([
      createUser('org@test.com', 'Org'),
      createUser('m@test.com', 'Member'),
    ]);
    const tanda = await createTanda(org.id);
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/join`)
      .send({ userId: member.id });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('member');
    expect(res.body.userId).toBe(member.id);
  });

  it('returns 409 if user already joined', async () => {
    const org = await createUser('org@test.com', 'Org');
    const tanda = await createTanda(org.id);
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/join`)
      .send({ userId: org.id }); // already organizer
    expect(res.status).toBe(409);
  });

  it('returns 422 if tanda is already active', async () => {
    const { tanda, m1 } = await setupActiveTanda();
    const newMember = await createUser('new@test.com', 'New');
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/join`)
      .send({ userId: newMember.id });
    expect(res.status).toBe(422);
    // m1 is already in, newMember should fail because tanda is active
    void m1;
  });

  it('returns 400 for invalid userId format', async () => {
    const org = await createUser('org@test.com', 'Org');
    const tanda = await createTanda(org.id);
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/join`)
      .send({ userId: 'not-a-uuid' });
    expect(res.status).toBe(400);
  });
});

// ── POST /api/tandas/:id/start ────────────────────────────────────────────────

describe('POST /api/tandas/:id/start', () => {
  it('starts with enough participants', async () => {
    const [org, m1, m2] = await Promise.all([
      createUser('org@test.com', 'Org'),
      createUser('m1@test.com', 'M1'),
      createUser('m2@test.com', 'M2'),
    ]);
    const tanda = await createTanda(org.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ organizerId: org.id });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
    expect(res.body.currentRound).toBe(1);
    expect(res.body.totalRounds).toBe(3);
  });

  it('returns 422 if fewer than 3 participants', async () => {
    const [org, m1] = await Promise.all([
      createUser('org@test.com', 'Org'),
      createUser('m1@test.com', 'M1'),
    ]);
    const tanda = await createTanda(org.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ organizerId: org.id });
    expect(res.status).toBe(422);
  });

  it('returns 403 if not the organizer', async () => {
    const [org, m1, m2] = await Promise.all([
      createUser('org@test.com', 'Org'),
      createUser('m1@test.com', 'M1'),
      createUser('m2@test.com', 'M2'),
    ]);
    const tanda = await createTanda(org.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ organizerId: m1.id });
    expect(res.status).toBe(403);
  });

  it('assigns rotationPosition to every participant', async () => {
    const { tanda } = await setupActiveTanda();
    const partRes = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const positions = partRes.body.map((p: { rotationPosition: number }) => p.rotationPosition);
    expect(positions.sort()).toEqual([1, 2, 3]);
  });
});

// ── POST /api/tandas/:id/cancel ───────────────────────────────────────────────

describe('POST /api/tandas/:id/cancel', () => {
  it('cancels a forming tanda', async () => {
    const org = await createUser('org@test.com', 'Org');
    const tanda = await createTanda(org.id);
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/cancel`)
      .send({ organizerId: org.id });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('cancels an active tanda', async () => {
    const { tanda, org } = await setupActiveTanda();
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/cancel`)
      .send({ organizerId: org.id });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('returns 403 if not the organizer', async () => {
    const [org, other] = await Promise.all([
      createUser('org@test.com', 'Org'),
      createUser('other@test.com', 'Other'),
    ]);
    const tanda = await createTanda(org.id);
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/cancel`)
      .send({ organizerId: other.id });
    expect(res.status).toBe(403);
  });

  it('returns 422 for already cancelled tanda', async () => {
    const org = await createUser('org@test.com', 'Org');
    const tanda = await createTanda(org.id);
    await request(app).post(`/api/tandas/${tanda.id}/cancel`).send({ organizerId: org.id });

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/cancel`)
      .send({ organizerId: org.id });
    expect(res.status).toBe(422);
  });
});

// ── GET /api/tandas/:id/participants ──────────────────────────────────────────

describe('GET /api/tandas/:id/participants', () => {
  it('lists all participants', async () => {
    const { tanda } = await setupActiveTanda();
    const res = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  it('returns 404 for unknown tanda', async () => {
    const res = await request(app).get(
      '/api/tandas/00000000-0000-0000-0000-000000000000/participants',
    );
    expect(res.status).toBe(404);
  });
});

// ── POST /api/tandas/:id/advance ──────────────────────────────────────────────

describe('POST /api/tandas/:id/advance', () => {
  it('advances to next round', async () => {
    const { tanda, org } = await setupActiveTanda();
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .send({ organizerId: org.id });

    expect(res.status).toBe(200);
    expect(res.body.currentRound).toBe(2);
  });

  it('auto-completes after last round', async () => {
    const { tanda, org } = await setupActiveTanda(); // 3 rounds
    await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ organizerId: org.id }); // → 2
    await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ organizerId: org.id }); // → 3
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .send({ organizerId: org.id }); // → completed

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
  });

  it('returns 403 if not the organizer', async () => {
    const { tanda, m1 } = await setupActiveTanda();
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .send({ organizerId: m1.id });
    expect(res.status).toBe(403);
  });

  it('returns 422 for non-active tanda', async () => {
    const org = await createUser('org@test.com', 'Org');
    const tanda = await createTanda(org.id);
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .send({ organizerId: org.id });
    expect(res.status).toBe(422);
  });
});
