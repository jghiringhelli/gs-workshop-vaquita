import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { db } from '../src/db';

beforeEach(() => {
  db.exec(`
    DELETE FROM contributions;
    DELETE FROM participants;
    DELETE FROM tandas;
    DELETE FROM users;
  `);
});

async function createUser(email: string, name: string) {
  const res = await request(app).post('/api/users').send({ email, name });
  return res.body;
}

async function createTanda(organizerId: string, name = 'Tanda Test', amount = 1000) {
  const res = await request(app).post('/api/tandas').send({ name, organizerId, contributionAmount: amount });
  return res.body;
}

async function setupActiveTanda() {
  const organizer = await createUser('org@test.com', 'Organizer');
  const m1 = await createUser('m1@test.com', 'Member1');
  const m2 = await createUser('m2@test.com', 'Member2');
  const tanda = await createTanda(organizer.id);
  await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
  await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
  await request(app).post(`/api/tandas/${tanda.id}/start`).send({ requesterId: organizer.id });
  const started = await request(app).get(`/api/tandas/${tanda.id}`);
  return { organizer, m1, m2, tanda: started.body };
}

describe('POST /api/tandas', () => {
  it('creates a tanda and auto-joins organizer', async () => {
    const user = await createUser('org@test.com', 'Org');
    const res = await request(app).post('/api/tandas').send({
      name: 'Mi Tanda', organizerId: user.id, contributionAmount: 500,
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('forming');

    const participants = await request(app).get(`/api/tandas/${res.body.id}/participants`);
    expect(participants.body).toHaveLength(1);
    expect(participants.body[0].role).toBe('organizer');
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/api/tandas').send({ name: 'X' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/tandas', () => {
  it('lists tandas for a user', async () => {
    const user = await createUser('u@test.com', 'U');
    await createTanda(user.id);
    const res = await request(app).get(`/api/tandas?userId=${user.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('POST /api/tandas/:id/join', () => {
  it('joins a tanda', async () => {
    const org = await createUser('org@test.com', 'Org');
    const member = await createUser('m@test.com', 'M');
    const tanda = await createTanda(org.id);
    const res = await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member.id });
    expect(res.status).toBe(201);
  });

  it('returns 409 if already joined', async () => {
    const org = await createUser('org@test.com', 'Org');
    const tanda = await createTanda(org.id);
    const res = await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: org.id });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/tandas/:id/start', () => {
  it('starts tanda with 3+ participants', async () => {
    const { tanda } = await setupActiveTanda();
    expect(tanda.status).toBe('active');
    expect(tanda.current_round).toBe(1);
  });

  it('returns 400 with fewer than 3 participants', async () => {
    const org = await createUser('org@test.com', 'Org');
    const tanda = await createTanda(org.id);
    const res = await request(app).post(`/api/tandas/${tanda.id}/start`).send({ requesterId: org.id });
    expect(res.status).toBe(400);
  });

  it('returns 403 if not organizer', async () => {
    const org = await createUser('org@test.com', 'Org');
    const m1 = await createUser('m1@test.com', 'M1');
    const m2 = await createUser('m2@test.com', 'M2');
    const m3 = await createUser('m3@test.com', 'M3');
    const tanda = await createTanda(org.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m3.id });
    const res = await request(app).post(`/api/tandas/${tanda.id}/start`).send({ requesterId: m1.id });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/tandas/:id/cancel', () => {
  it('cancels a tanda', async () => {
    const org = await createUser('org@test.com', 'Org');
    const tanda = await createTanda(org.id);
    const res = await request(app).post(`/api/tandas/${tanda.id}/cancel`).send({ requesterId: org.id });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('returns 403 if not organizer', async () => {
    const org = await createUser('org@test.com', 'Org');
    const m = await createUser('m@test.com', 'M');
    const tanda = await createTanda(org.id);
    const res = await request(app).post(`/api/tandas/${tanda.id}/cancel`).send({ requesterId: m.id });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/tandas/:id/contributions', () => {
  it('records a contribution', async () => {
    const { tanda } = await setupActiveTanda();
    const participants = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const pid = participants.body[0].id;
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: pid, amount: 1000 });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('paid');
  });

  it('returns 400 for wrong amount', async () => {
    const { tanda } = await setupActiveTanda();
    const participants = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const pid = participants.body[0].id;
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: pid, amount: 999 });
    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate contribution', async () => {
    const { tanda } = await setupActiveTanda();
    const participants = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const pid = participants.body[0].id;
    await request(app).post(`/api/tandas/${tanda.id}/contributions`).send({ participantId: pid, amount: 1000 });
    const res = await request(app).post(`/api/tandas/${tanda.id}/contributions`).send({ participantId: pid, amount: 1000 });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/tandas/:id/advance', () => {
  it('advances the round', async () => {
    const { organizer, tanda } = await setupActiveTanda();
    const res = await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ requesterId: organizer.id });
    expect(res.status).toBe(200);
    expect(res.body.current_round).toBe(2);
  });

  it('auto-completes on last round', async () => {
    const { organizer, tanda } = await setupActiveTanda();
    // advance all rounds
    for (let i = 0; i < tanda.total_rounds; i++) {
      await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ requesterId: organizer.id });
    }
    const final = await request(app).get(`/api/tandas/${tanda.id}`);
    expect(final.body.status).toBe('completed');
  });
});

describe('GET /api/tandas/:id/rounds/:round', () => {
  it('returns round summary', async () => {
    const { tanda } = await setupActiveTanda();
    const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/1`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('round', 1);
    expect(res.body).toHaveProperty('contributions');
  });
});

describe('GET /api/tandas/:id/participants/:pid/history', () => {
  it('returns participant contribution history', async () => {
    const { tanda } = await setupActiveTanda();
    const participants = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const pid = participants.body[0].id;
    await request(app).post(`/api/tandas/${tanda.id}/contributions`).send({ participantId: pid, amount: 1000 });
    const res = await request(app).get(`/api/tandas/${tanda.id}/participants/${pid}/history`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('GET /api/tandas/:id/stats', () => {
  it('returns tanda stats', async () => {
    const { tanda } = await setupActiveTanda();
    const res = await request(app).get(`/api/tandas/${tanda.id}/stats`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalParticipants', 3);
    expect(res.body).toHaveProperty('totalCollected');
    expect(res.body).toHaveProperty('participantsSummary');
  });

  it('returns 404 for unknown tanda', async () => {
    const res = await request(app).get('/api/tandas/00000000-0000-0000-0000-000000000000/stats');
    expect(res.status).toBe(404);
  });
});
