import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../app';
import { closeDb } from '../db/database';

beforeEach(() => {
  closeDb();
});

async function createUser(email: string, name: string) {
  const res = await request(app).post('/api/users').send({ email, name });
  return res.body as { id: number; email: string; name: string };
}

async function createTanda(organizerId: number, name = 'Test Tanda', amount = 500) {
  const res = await request(app)
    .post('/api/tandas')
    .send({ name, organizerId, contributionAmount: amount });
  return res.body as { id: number; status: string; totalRounds: number; currentRound: number };
}

async function joinTanda(tandaId: number, userId: number) {
  return request(app).post(`/api/tandas/${tandaId}/join`).send({ userId });
}

async function seedActiveTanda() {
  const u1 = await createUser('org@test.com', 'Organizer');
  const u2 = await createUser('m1@test.com', 'Member1');
  const u3 = await createUser('m2@test.com', 'Member2');
  const tanda = await createTanda(u1.id);
  await joinTanda(tanda.id, u2.id);
  await joinTanda(tanda.id, u3.id);
  const startRes = await request(app)
    .post(`/api/tandas/${tanda.id}/start`)
    .send({ userId: u1.id });
  return { tanda: startRes.body, u1, u2, u3 };
}

describe('POST /api/tandas', () => {
  it('creates a tanda and returns 201', async () => {
    const u = await createUser('org@example.com', 'Org');
    const res = await request(app)
      .post('/api/tandas')
      .send({ name: 'Tanda Enero', organizerId: u.id, contributionAmount: 1000 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Tanda Enero', status: 'forming' });
  });

  it('returns 404 for unknown organizer', async () => {
    const res = await request(app)
      .post('/api/tandas')
      .send({ name: 'Tanda', organizerId: 9999, contributionAmount: 100 });
    expect(res.status).toBe(404);
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/api/tandas').send({ name: 'Bad' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/tandas', () => {
  it('requires userId param', async () => {
    const res = await request(app).get('/api/tandas');
    expect(res.status).toBe(400);
  });

  it('returns tandas for user', async () => {
    const u = await createUser('x@x.com', 'X');
    await createTanda(u.id);
    const res = await request(app).get(`/api/tandas?userId=${u.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('returns 404 for unknown user', async () => {
    const res = await request(app).get('/api/tandas?userId=9999');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/tandas/:id', () => {
  it('returns tanda by id', async () => {
    const u = await createUser('y@y.com', 'Y');
    const t = await createTanda(u.id);
    const res = await request(app).get(`/api/tandas/${t.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(t.id);
  });

  it('returns 404 for unknown tanda', async () => {
    const res = await request(app).get('/api/tandas/9999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/tandas/:id/join', () => {
  it('allows a user to join a forming tanda', async () => {
    const org = await createUser('org2@test.com', 'Org2');
    const member = await createUser('mem@test.com', 'Member');
    const t = await createTanda(org.id);
    const res = await joinTanda(t.id, member.id);
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(member.id);
  });

  it('returns 409 if user already joined', async () => {
    const org = await createUser('org3@test.com', 'Org3');
    const t = await createTanda(org.id);
    const res = await joinTanda(t.id, org.id);
    expect(res.status).toBe(409);
  });

  it('returns 400 if tanda is not forming', async () => {
    const { tanda, u2 } = await seedActiveTanda();
    const newUser = await createUser('new@test.com', 'New');
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/join`)
      .send({ userId: newUser.id });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/tandas/:id/start', () => {
  it('starts a tanda with 3+ participants', async () => {
    const u1 = await createUser('s1@test.com', 'S1');
    const u2 = await createUser('s2@test.com', 'S2');
    const u3 = await createUser('s3@test.com', 'S3');
    const t = await createTanda(u1.id);
    await joinTanda(t.id, u2.id);
    await joinTanda(t.id, u3.id);
    const res = await request(app).post(`/api/tandas/${t.id}/start`).send({ userId: u1.id });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
    expect(res.body.totalRounds).toBe(3);
  });

  it('returns 400 with fewer than 3 participants', async () => {
    const u1 = await createUser('f1@test.com', 'F1');
    const u2 = await createUser('f2@test.com', 'F2');
    const t = await createTanda(u1.id);
    await joinTanda(t.id, u2.id);
    const res = await request(app).post(`/api/tandas/${t.id}/start`).send({ userId: u1.id });
    expect(res.status).toBe(400);
  });

  it('returns 403 for non-organizer', async () => {
    const u1 = await createUser('g1@test.com', 'G1');
    const u2 = await createUser('g2@test.com', 'G2');
    const u3 = await createUser('g3@test.com', 'G3');
    const t = await createTanda(u1.id);
    await joinTanda(t.id, u2.id);
    await joinTanda(t.id, u3.id);
    const res = await request(app).post(`/api/tandas/${t.id}/start`).send({ userId: u2.id });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/tandas/:id/cancel', () => {
  it('cancels a forming tanda', async () => {
    const u = await createUser('c1@test.com', 'C1');
    const t = await createTanda(u.id);
    const res = await request(app).post(`/api/tandas/${t.id}/cancel`).send({ userId: u.id });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('returns 403 for non-organizer', async () => {
    const u1 = await createUser('ca1@test.com', 'CA1');
    const u2 = await createUser('ca2@test.com', 'CA2');
    const t = await createTanda(u1.id);
    await joinTanda(t.id, u2.id);
    const res = await request(app).post(`/api/tandas/${t.id}/cancel`).send({ userId: u2.id });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/tandas/:id/participants', () => {
  it('lists participants', async () => {
    const { tanda } = await seedActiveTanda();
    const res = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  it('returns 404 for unknown tanda', async () => {
    const res = await request(app).get('/api/tandas/9999/participants');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/tandas/:id/contributions', () => {
  it('records a contribution', async () => {
    const { tanda, u1 } = await seedActiveTanda();
    const participants = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const p = participants.body.find((p: { userId: number }) => p.userId === u1.id);
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: p.id, amount: 500 });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('paid');
  });

  it('returns 409 for duplicate contribution', async () => {
    const { tanda, u1 } = await seedActiveTanda();
    const participants = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const p = participants.body.find((p: { userId: number }) => p.userId === u1.id);
    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: p.id, amount: 500 });
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: p.id, amount: 500 });
    expect(res.status).toBe(409);
  });

  it('returns 400 for inactive tanda', async () => {
    const u = await createUser('ia@test.com', 'IA');
    const t = await createTanda(u.id);
    const participants = await request(app).get(`/api/tandas/${t.id}/participants`);
    const p = participants.body[0];
    const res = await request(app)
      .post(`/api/tandas/${t.id}/contributions`)
      .send({ participantId: p.id, amount: 500 });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/tandas/:id/rounds/:round', () => {
  it('returns round summary', async () => {
    const { tanda } = await seedActiveTanda();
    const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/1`);
    expect(res.status).toBe(200);
    expect(res.body.round).toBe(1);
    expect(res.body).toHaveProperty('potAmount');
    expect(res.body).toHaveProperty('contributions');
  });

  it('returns 400 for invalid round', async () => {
    const { tanda } = await seedActiveTanda();
    const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/99`);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/tandas/:id/advance', () => {
  it('advances to next round', async () => {
    const { tanda, u1 } = await seedActiveTanda();
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .send({ userId: u1.id });
    expect(res.status).toBe(200);
    expect(res.body.currentRound).toBe(2);
  });

  it('completes tanda after last round', async () => {
    const { tanda, u1 } = await seedActiveTanda();
    await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ userId: u1.id });
    await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ userId: u1.id });
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .send({ userId: u1.id });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
  });

  it('returns 403 for non-organizer', async () => {
    const { tanda, u2 } = await seedActiveTanda();
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .send({ userId: u2.id });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/tandas/:id/participants/:pid/history', () => {
  it('returns contribution history', async () => {
    const { tanda, u1 } = await seedActiveTanda();
    const participants = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const p = participants.body.find((p: { userId: number }) => p.userId === u1.id);
    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: p.id, amount: 500 });
    const res = await request(app).get(`/api/tandas/${tanda.id}/participants/${p.id}/history`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('returns 404 for unknown participant', async () => {
    const { tanda } = await seedActiveTanda();
    const res = await request(app).get(`/api/tandas/${tanda.id}/participants/9999/history`);
    expect(res.status).toBe(404);
  });
});
