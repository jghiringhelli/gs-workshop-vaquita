import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import db from '../db';

function createUsers(count: number) {
  const promises = [];
  for (let i = 1; i <= count; i++) {
    promises.push(
      request(app)
        .post('/api/users')
        .send({ email: `user${i}@example.com`, name: `User ${i}` })
    );
  }
  return Promise.all(promises);
}

async function createTandaWithParticipants(participantCount: number = 3) {
  const users = await createUsers(participantCount);
  const organizer = users[0].body;

  const tandaRes = await request(app)
    .post('/api/tandas')
    .send({ name: 'Test Tanda', organizerId: organizer.id, contributionAmount: 1000 });

  const tanda = tandaRes.body;

  for (let i = 1; i < users.length; i++) {
    await request(app)
      .post(`/api/tandas/${tanda.id}/join`)
      .send({ userId: users[i].body.id });
  }

  return { tanda, organizer, users: users.map(u => u.body) };
}

beforeEach(() => {
  db.exec('DELETE FROM contributions');
  db.exec('DELETE FROM participants');
  db.exec('DELETE FROM tandas');
  db.exec('DELETE FROM users');
});

describe('POST /api/tandas', () => {
  it('should create a tanda and return 201', async () => {
    const userRes = await request(app)
      .post('/api/users')
      .send({ email: 'org@example.com', name: 'Org' });

    const res = await request(app)
      .post('/api/tandas')
      .send({ name: 'Tanda Enero', organizerId: userRes.body.id, contributionAmount: 1000 });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Tanda Enero');
    expect(res.body.status).toBe('forming');
    expect(res.body.contributionAmount).toBe(1000);
  });

  it('should return 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/tandas')
      .send({ name: 'Tanda' });

    expect(res.status).toBe(400);
  });

  it('should return 404 for non-existent organizer', async () => {
    const res = await request(app)
      .post('/api/tandas')
      .send({ name: 'Tanda', organizerId: 9999, contributionAmount: 500 });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/tandas', () => {
  it('should return all tandas', async () => {
    const userRes = await request(app)
      .post('/api/users')
      .send({ email: 'org@example.com', name: 'Org' });

    await request(app)
      .post('/api/tandas')
      .send({ name: 'T1', organizerId: userRes.body.id, contributionAmount: 500 });

    const res = await request(app).get('/api/tandas');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('should filter by userId', async () => {
    const users = await createUsers(2);
    await request(app).post('/api/tandas').send({ name: 'T1', organizerId: users[0].body.id, contributionAmount: 500 });
    await request(app).post('/api/tandas').send({ name: 'T2', organizerId: users[1].body.id, contributionAmount: 500 });

    const res = await request(app).get(`/api/tandas?userId=${users[0].body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('T1');
  });
});

describe('GET /api/tandas/:id', () => {
  it('should return a tanda by ID', async () => {
    const userRes = await request(app)
      .post('/api/users')
      .send({ email: 'org@example.com', name: 'Org' });

    const tandaRes = await request(app)
      .post('/api/tandas')
      .send({ name: 'T1', organizerId: userRes.body.id, contributionAmount: 500 });

    const res = await request(app).get(`/api/tandas/${tandaRes.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('T1');
  });

  it('should return 404 for non-existent tanda', async () => {
    const res = await request(app).get('/api/tandas/9999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/tandas/:id/join', () => {
  it('should join a tanda', async () => {
    const users = await createUsers(2);
    const tandaRes = await request(app)
      .post('/api/tandas')
      .send({ name: 'T1', organizerId: users[0].body.id, contributionAmount: 500 });

    const res = await request(app)
      .post(`/api/tandas/${tandaRes.body.id}/join`)
      .send({ userId: users[1].body.id });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.role).toBe('member');
  });

  it('should return 409 if user already joined', async () => {
    const users = await createUsers(2);
    const tandaRes = await request(app)
      .post('/api/tandas')
      .send({ name: 'T1', organizerId: users[0].body.id, contributionAmount: 500 });

    await request(app).post(`/api/tandas/${tandaRes.body.id}/join`).send({ userId: users[1].body.id });
    const res = await request(app).post(`/api/tandas/${tandaRes.body.id}/join`).send({ userId: users[1].body.id });

    expect(res.status).toBe(409);
  });
});

describe('POST /api/tandas/:id/start', () => {
  it('should start a tanda with >= 3 participants', async () => {
    const { tanda, organizer } = await createTandaWithParticipants(3);

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ organizerId: organizer.id });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
    expect(res.body.currentRound).toBe(1);
    expect(res.body.totalRounds).toBe(3);
  });

  it('should return 400 if fewer than 3 participants', async () => {
    const users = await createUsers(2);
    const tandaRes = await request(app)
      .post('/api/tandas')
      .send({ name: 'T1', organizerId: users[0].body.id, contributionAmount: 500 });

    await request(app).post(`/api/tandas/${tandaRes.body.id}/join`).send({ userId: users[1].body.id });

    const res = await request(app)
      .post(`/api/tandas/${tandaRes.body.id}/start`)
      .send({ organizerId: users[0].body.id });

    expect(res.status).toBe(400);
  });

  it('should return 403 if non-organizer tries to start', async () => {
    const { tanda, users } = await createTandaWithParticipants(3);

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ organizerId: users[1].id });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/tandas/:id/cancel', () => {
  it('should cancel a forming tanda', async () => {
    const userRes = await request(app)
      .post('/api/users')
      .send({ email: 'org@example.com', name: 'Org' });

    const tandaRes = await request(app)
      .post('/api/tandas')
      .send({ name: 'T1', organizerId: userRes.body.id, contributionAmount: 500 });

    const res = await request(app)
      .post(`/api/tandas/${tandaRes.body.id}/cancel`)
      .send({ organizerId: userRes.body.id });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('should return 403 for non-organizer', async () => {
    const users = await createUsers(2);
    const tandaRes = await request(app)
      .post('/api/tandas')
      .send({ name: 'T1', organizerId: users[0].body.id, contributionAmount: 500 });

    const res = await request(app)
      .post(`/api/tandas/${tandaRes.body.id}/cancel`)
      .send({ organizerId: users[1].body.id });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/tandas/:id/participants', () => {
  it('should return participants', async () => {
    const { tanda } = await createTandaWithParticipants(3);

    const res = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });
});

describe('POST /api/tandas/:id/contributions', () => {
  it('should record a contribution', async () => {
    const { tanda, organizer } = await createTandaWithParticipants(3);

    await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ organizerId: organizer.id });

    const participants = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const p = participants.body[0];

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: p.id, amount: 1000 });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('paid');
    expect(res.body.amount).toBe(1000);
  });

  it('should return 409 for duplicate contribution in same round', async () => {
    const { tanda, organizer } = await createTandaWithParticipants(3);

    await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ organizerId: organizer.id });

    const participants = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const p = participants.body[0];

    await request(app).post(`/api/tandas/${tanda.id}/contributions`).send({ participantId: p.id, amount: 1000 });
    const res = await request(app).post(`/api/tandas/${tanda.id}/contributions`).send({ participantId: p.id, amount: 1000 });

    expect(res.status).toBe(409);
  });

  it('should return 400 for wrong amount', async () => {
    const { tanda, organizer } = await createTandaWithParticipants(3);

    await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ organizerId: organizer.id });

    const participants = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const p = participants.body[0];

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: p.id, amount: 500 });

    expect(res.status).toBe(400);
  });

  it('should apply late penalty', async () => {
    const { tanda, organizer } = await createTandaWithParticipants(3);

    await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ organizerId: organizer.id });

    const participants = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const p = participants.body[0];

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: p.id, amount: 1000, isLate: true });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('late');
    expect(res.body.amount).toBe(1050);
  });
});

describe('POST /api/tandas/:id/advance', () => {
  it('should advance to the next round', async () => {
    const { tanda, organizer } = await createTandaWithParticipants(3);

    await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ organizerId: organizer.id });

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .send({ organizerId: organizer.id });

    expect(res.status).toBe(200);
    expect(res.body.currentRound).toBe(2);
  });

  it('should auto-complete after last round', async () => {
    const { tanda, organizer } = await createTandaWithParticipants(3);

    await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ organizerId: organizer.id });

    // Advance through all rounds
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .send({ organizerId: organizer.id });
    }

    const final = await request(app).get(`/api/tandas/${tanda.id}`);
    expect(final.body.status).toBe('completed');
  });

  it('should return 403 for non-organizer', async () => {
    const { tanda, users } = await createTandaWithParticipants(3);

    await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ organizerId: users[0].id });

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .send({ organizerId: users[1].id });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/tandas/:id/rounds/:round', () => {
  it('should return round summary', async () => {
    const { tanda, organizer } = await createTandaWithParticipants(3);

    await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ organizerId: organizer.id });

    const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/1`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('round', 1);
    expect(res.body).toHaveProperty('contributions');
    expect(res.body).toHaveProperty('totalCollected');
  });

  it('should return 404 for invalid round', async () => {
    const { tanda, organizer } = await createTandaWithParticipants(3);

    await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ organizerId: organizer.id });

    const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/99`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/tandas/:id/participants/:pid/history', () => {
  it('should return contribution history', async () => {
    const { tanda, organizer } = await createTandaWithParticipants(3);

    await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ organizerId: organizer.id });

    const participants = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const p = participants.body[0];

    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: p.id, amount: 1000 });

    const res = await request(app).get(`/api/tandas/${tanda.id}/participants/${p.id}/history`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('paid');
  });

  it('should return 404 for non-existent participant', async () => {
    const { tanda, organizer } = await createTandaWithParticipants(3);

    await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .send({ organizerId: organizer.id });

    const res = await request(app).get(`/api/tandas/${tanda.id}/participants/9999/history`);
    expect(res.status).toBe(404);
  });
});
