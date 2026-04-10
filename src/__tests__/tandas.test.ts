import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { closeDb } from '../db';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  closeDb();
});

// ─── Helpers ────────────────────────────────────────────────────────────────

async function createUser(email: string, name: string) {
  const res = await request(app).post('/api/users').send({ email, name });
  expect(res.status).toBe(201);
  return res.body as { id: number; email: string; name: string };
}

async function createTanda(organizerId: number, name = 'Test Tanda', amount = 1000) {
  const res = await request(app)
    .post('/api/tandas')
    .send({ name, organizerId, contributionAmount: amount });
  expect(res.status).toBe(201);
  return res.body as { id: number; organizerId: number; status: string };
}

async function joinTanda(tandaId: number, userId: number) {
  const res = await request(app)
    .post(`/api/tandas/${tandaId}/join`)
    .send({ userId });
  expect(res.status).toBe(201);
  return res.body as { id: number };
}

// ─── POST /api/tandas ────────────────────────────────────────────────────────

describe('POST /api/tandas', () => {
  it('creates a tanda and auto-joins the organizer', async () => {
    const user = await createUser('organizer1@test.com', 'Organizer1');

    const res = await request(app)
      .post('/api/tandas')
      .send({ name: 'Tanda Enero', organizerId: user.id, contributionAmount: 500 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Tanda Enero',
      organizerId: user.id,
      status: 'forming',
      currentRound: 1,
    });

    // organizer should appear in participants list
    const parts = await request(app).get(`/api/tandas/${res.body.id}/participants`);
    expect(parts.body.some((p: { userId: number; role: string }) => p.userId === user.id && p.role === 'organizer')).toBe(true);
  });

  it('returns 404 when organizerId is unknown', async () => {
    const res = await request(app)
      .post('/api/tandas')
      .send({ name: 'Ghost Tanda', organizerId: 99999, contributionAmount: 100 });

    expect(res.status).toBe(404);
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/api/tandas').send({ name: 'Bad' });
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/tandas?userId= ──────────────────────────────────────────────────

describe('GET /api/tandas', () => {
  it('lists tandas for a user', async () => {
    const user = await createUser('listuser@test.com', 'ListUser');
    await createTanda(user.id, 'User Tanda', 200);

    const res = await request(app).get(`/api/tandas?userId=${user.id}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('returns 400 when userId is missing', async () => {
    const res = await request(app).get('/api/tandas');
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/tandas/:id ──────────────────────────────────────────────────────

describe('GET /api/tandas/:id', () => {
  it('returns tanda details', async () => {
    const user = await createUser('getdetail@test.com', 'GetDetail');
    const tanda = await createTanda(user.id, 'Detail Tanda', 100);

    const res = await request(app).get(`/api/tandas/${tanda.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(tanda.id);
  });

  it('returns 404 for unknown tanda', async () => {
    const res = await request(app).get('/api/tandas/99999');
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/tandas/:id/join ────────────────────────────────────────────────

describe('POST /api/tandas/:id/join', () => {
  it('adds a member to a forming tanda', async () => {
    const org = await createUser('joinorg@test.com', 'JoinOrg');
    const member = await createUser('joinmember@test.com', 'JoinMember');
    const tanda = await createTanda(org.id, 'Join Tanda');

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/join`)
      .send({ userId: member.id });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ userId: member.id, role: 'member' });
  });

  it('returns 409 if user already joined', async () => {
    const org = await createUser('dupe-org@test.com', 'DupeOrg');
    const member = await createUser('dupe-member@test.com', 'DupeMember');
    const tanda = await createTanda(org.id, 'Dupe Tanda');

    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member.id });
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/join`)
      .send({ userId: member.id });

    expect(res.status).toBe(409);
  });
});

// ─── POST /api/tandas/:id/start ──────────────────────────────────────────────

describe('POST /api/tandas/:id/start', () => {
  async function buildTandaWith3(prefix: string) {
    const org = await createUser(`${prefix}-org@test.com`, `${prefix}Org`);
    const m1 = await createUser(`${prefix}-m1@test.com`, `${prefix}M1`);
    const m2 = await createUser(`${prefix}-m2@test.com`, `${prefix}M2`);
    const tanda = await createTanda(org.id, `${prefix} Tanda`);
    await joinTanda(tanda.id, m1.id);
    await joinTanda(tanda.id, m2.id);
    return { org, tanda };
  }

  it('starts a tanda with enough participants', async () => {
    const { org, tanda } = await buildTandaWith3('start1');

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ organizerId: org.id });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
    expect(res.body.totalRounds).toBe(3);
  });

  it('returns 403 when requester is not the organizer', async () => {
    const { tanda } = await buildTandaWith3('start2');
    const impostor = await createUser('impostor@test.com', 'Impostor');

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ organizerId: impostor.id });

    expect(res.status).toBe(403);
  });

  it('returns 400 when fewer than 3 participants', async () => {
    const org = await createUser('fewparts-org@test.com', 'FewPartsOrg');
    const tanda = await createTanda(org.id, 'Too Small');

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ organizerId: org.id });

    expect(res.status).toBe(400);
  });
});

// ─── POST /api/tandas/:id/cancel ─────────────────────────────────────────────

describe('POST /api/tandas/:id/cancel', () => {
  it('cancels a forming tanda', async () => {
    const org = await createUser('cancelorg@test.com', 'CancelOrg');
    const tanda = await createTanda(org.id, 'Cancel Me');

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/cancel`)
      .send({ organizerId: org.id });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('returns 403 for non-organizer', async () => {
    const org = await createUser('cancelorg2@test.com', 'CancelOrg2');
    const rando = await createUser('rando@test.com', 'Rando');
    const tanda = await createTanda(org.id, 'Cancel Me2');

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/cancel`)
      .send({ organizerId: rando.id });

    expect(res.status).toBe(403);
  });
});

// ─── POST /api/tandas/:id/contributions ──────────────────────────────────────

describe('POST /api/tandas/:id/contributions', () => {
  async function startedTanda(prefix: string) {
    const org = await createUser(`${prefix}-corg@test.com`, `${prefix}COOrg`);
    const m1 = await createUser(`${prefix}-cm1@test.com`, `${prefix}CM1`);
    const m2 = await createUser(`${prefix}-cm2@test.com`, `${prefix}CM2`);
    const tanda = await createTanda(org.id, `${prefix} CTanda`, 500);
    const p1 = await joinTanda(tanda.id, m1.id);
    await joinTanda(tanda.id, m2.id);
    await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ organizerId: org.id });
    const orgPart = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const orgParticipant = orgPart.body.find(
      (p: { userId: number }) => p.userId === org.id,
    ) as { id: number };
    return { tanda, orgParticipantId: orgParticipant.id, memberParticipantId: p1.id };
  }

  it('records a contribution for the current round', async () => {
    const { tanda, orgParticipantId } = await startedTanda('contrib1');

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: orgParticipantId, amount: 500 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ participantId: orgParticipantId, round: 1, status: 'paid' });
  });

  it('returns 409 for duplicate contribution in same round', async () => {
    const { tanda, memberParticipantId } = await startedTanda('contrib2');

    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: memberParticipantId, amount: 500 });

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: memberParticipantId, amount: 500 });

    expect(res.status).toBe(409);
  });

  it('returns 422 for inactive tanda', async () => {
    const org = await createUser('inactiveorg@test.com', 'InactiveOrg');
    const tanda = await createTanda(org.id, 'Inactive Tanda');

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: 1, amount: 500 });

    expect(res.status).toBe(422);
  });
});

// ─── GET /api/tandas/:id/rounds/:round ───────────────────────────────────────

describe('GET /api/tandas/:id/rounds/:round', () => {
  it('returns round summary', async () => {
    const org = await createUser('rsorg@test.com', 'RSOOrg');
    const m1 = await createUser('rsm1@test.com', 'RSM1');
    const m2 = await createUser('rsm2@test.com', 'RSM2');
    const tanda = await createTanda(org.id, 'RS Tanda', 200);
    await joinTanda(tanda.id, m1.id);
    await joinTanda(tanda.id, m2.id);
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: org.id });

    const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/1`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ round: 1, totalRounds: 3 });
  });

  it('returns 400 for out-of-range round', async () => {
    const org = await createUser('oor-org@test.com', 'OOROrg');
    const m1 = await createUser('oor-m1@test.com', 'OORM1');
    const m2 = await createUser('oor-m2@test.com', 'OORM2');
    const tanda = await createTanda(org.id, 'OOR Tanda', 200);
    await joinTanda(tanda.id, m1.id);
    await joinTanda(tanda.id, m2.id);
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: org.id });

    const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/99`);
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/tandas/:id/advance ────────────────────────────────────────────

describe('POST /api/tandas/:id/advance', () => {
  it('advances the round and marks unpaid contributions as missed', async () => {
    const org = await createUser('advorg@test.com', 'AdvOrg');
    const m1 = await createUser('advm1@test.com', 'AdvM1');
    const m2 = await createUser('advm2@test.com', 'AdvM2');
    const tanda = await createTanda(org.id, 'Adv Tanda', 300);
    await joinTanda(tanda.id, m1.id);
    await joinTanda(tanda.id, m2.id);
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: org.id });

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .send({ organizerId: org.id });

    expect(res.status).toBe(200);
    expect(res.body.currentRound).toBe(2);
  });

  it('returns 403 for non-organizer', async () => {
    const org = await createUser('advorg2@test.com', 'AdvOrg2');
    const m1 = await createUser('advm1b@test.com', 'AdvM1b');
    const m2 = await createUser('advm2b@test.com', 'AdvM2b');
    const tanda = await createTanda(org.id, 'Adv Tanda2', 300);
    await joinTanda(tanda.id, m1.id);
    await joinTanda(tanda.id, m2.id);
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: org.id });

    const rando = await createUser('advrando@test.com', 'AdvRando');
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .send({ organizerId: rando.id });

    expect(res.status).toBe(403);
  });
});

// ─── GET /api/tandas/:id/participants/:pid/history ───────────────────────────

describe('GET /api/tandas/:id/participants/:pid/history', () => {
  it('returns contribution history for a participant', async () => {
    const org = await createUser('historg@test.com', 'HistOrg');
    const m1 = await createUser('histm1@test.com', 'HistM1');
    const m2 = await createUser('histm2@test.com', 'HistM2');
    const tanda = await createTanda(org.id, 'Hist Tanda', 400);
    await joinTanda(tanda.id, m1.id);
    await joinTanda(tanda.id, m2.id);
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: org.id });

    const partsRes = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const orgPart = partsRes.body.find((p: { userId: number }) => p.userId === org.id) as { id: number };

    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: orgPart.id, amount: 400 });

    const res = await request(app).get(
      `/api/tandas/${tanda.id}/participants/${orgPart.id}/history`,
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toMatchObject({ participantId: orgPart.id, round: 1, status: 'paid' });
  });

  it('returns 404 for unknown participant', async () => {
    const org = await createUser('historg2@test.com', 'HistOrg2');
    const tanda = await createTanda(org.id, 'Hist Tanda2', 100);

    const res = await request(app).get(`/api/tandas/${tanda.id}/participants/99999/history`);
    expect(res.status).toBe(404);
  });
});
