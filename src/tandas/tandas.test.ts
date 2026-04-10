import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app';
import { createDatabase } from '../db/database';

function makeApp(): Express {
  return createApp(createDatabase(':memory:'));
}

async function createUser(app: Express, email = 'alice@example.com', name = 'Alice') {
  const res = await request(app).post('/api/users').send({ email, name });
  return res.body.data as { id: string; email: string; name: string };
}

async function createTanda(app: Express, organizerId: string, name = 'Tanda Enero', amount = 1000) {
  const res = await request(app)
    .post('/api/tandas')
    .send({ name, organizerId, contributionAmount: amount });
  return res.body.data as { id: string; status: string; organizerId: string };
}

describe('POST /api/tandas', () => {
  it('creates a tanda and returns 201', async () => {
    const app = makeApp();
    const user = await createUser(app);
    const res = await request(app)
      .post('/api/tandas')
      .send({ name: 'Tanda Enero', organizerId: user.id, contributionAmount: 1000 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Tanda Enero', status: 'forming' });
  });

  it('returns 404 when organizer does not exist', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/tandas')
      .send({ name: 'Tanda', organizerId: '00000000-0000-0000-0000-000000000000', contributionAmount: 1000 });
    expect(res.status).toBe(404);
  });

  it('returns 422 when name is missing', async () => {
    const app = makeApp();
    const user = await createUser(app);
    const res = await request(app).post('/api/tandas').send({ organizerId: user.id, contributionAmount: 500 });
    expect(res.status).toBe(422);
  });

  it('returns 422 when contributionAmount is negative', async () => {
    const app = makeApp();
    const user = await createUser(app);
    const res = await request(app)
      .post('/api/tandas')
      .send({ name: 'Tanda', organizerId: user.id, contributionAmount: -100 });
    expect(res.status).toBe(422);
  });
});

describe('GET /api/tandas', () => {
  it('returns 422 when userId is missing', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/tandas');
    expect(res.status).toBe(422);
  });

  it('returns tandas for a user', async () => {
    const app = makeApp();
    const user = await createUser(app);
    await createTanda(app, user.id);
    const res = await request(app).get(`/api/tandas?userId=${user.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('GET /api/tandas/:id', () => {
  it('returns tanda by id', async () => {
    const app = makeApp();
    const user = await createUser(app);
    const tanda = await createTanda(app, user.id);
    const res = await request(app).get(`/api/tandas/${tanda.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(tanda.id);
  });

  it('returns 404 for unknown tanda', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/tandas/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/tandas/:id/join', () => {
  it('adds a user to a tanda', async () => {
    const app = makeApp();
    const organizer = await createUser(app);
    const member = await createUser(app, 'bob@example.com', 'Bob');
    const tanda = await createTanda(app, organizer.id);
    const res = await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member.id });
    expect(res.status).toBe(201);
    expect(res.body.data.userId).toBe(member.id);
    expect(res.body.data.role).toBe('member');
  });

  it('returns 409 when user already joined', async () => {
    const app = makeApp();
    const organizer = await createUser(app);
    const tanda = await createTanda(app, organizer.id);
    const res = await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: organizer.id });
    expect(res.status).toBe(409);
  });

  it('returns 422 when tanda is not forming', async () => {
    const app = makeApp();
    const organizer = await createUser(app, 'org@example.com', 'Organizer');
    const m1 = await createUser(app, 'm1@example.com', 'M1');
    const m2 = await createUser(app, 'm2@example.com', 'M2');
    const m3 = await createUser(app, 'm3@example.com', 'M3');
    const tanda = await createTanda(app, organizer.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ requesterId: organizer.id });
    const res = await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m3.id });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/tandas/:id/start', () => {
  it('starts a tanda with enough participants', async () => {
    const app = makeApp();
    const organizer = await createUser(app, 'org@example.com', 'Organizer');
    const m1 = await createUser(app, 'm1@example.com', 'M1');
    const m2 = await createUser(app, 'm2@example.com', 'M2');
    const tanda = await createTanda(app, organizer.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
    const res = await request(app).post(`/api/tandas/${tanda.id}/start`).send({ requesterId: organizer.id });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.totalRounds).toBe(3);
  });

  it('returns 422 when not enough participants', async () => {
    const app = makeApp();
    const organizer = await createUser(app);
    const tanda = await createTanda(app, organizer.id);
    const res = await request(app).post(`/api/tandas/${tanda.id}/start`).send({ requesterId: organizer.id });
    expect(res.status).toBe(422);
  });

  it('returns 403 when non-organizer tries to start', async () => {
    const app = makeApp();
    const organizer = await createUser(app, 'org@example.com', 'Organizer');
    const m1 = await createUser(app, 'm1@example.com', 'M1');
    const m2 = await createUser(app, 'm2@example.com', 'M2');
    const tanda = await createTanda(app, organizer.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
    const res = await request(app).post(`/api/tandas/${tanda.id}/start`).send({ requesterId: m1.id });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/tandas/:id/cancel', () => {
  it('cancels a forming tanda', async () => {
    const app = makeApp();
    const organizer = await createUser(app);
    const tanda = await createTanda(app, organizer.id);
    const res = await request(app).post(`/api/tandas/${tanda.id}/cancel`).send({ requesterId: organizer.id });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('returns 403 when non-organizer cancels', async () => {
    const app = makeApp();
    const organizer = await createUser(app, 'org@example.com', 'Org');
    const other = await createUser(app, 'other@example.com', 'Other');
    const tanda = await createTanda(app, organizer.id);
    const res = await request(app).post(`/api/tandas/${tanda.id}/cancel`).send({ requesterId: other.id });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/tandas/:id/participants', () => {
  it('returns participants in a tanda', async () => {
    const app = makeApp();
    const organizer = await createUser(app, 'org@example.com', 'Organizer');
    const member = await createUser(app, 'mem@example.com', 'Member');
    const tanda = await createTanda(app, organizer.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member.id });
    const res = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe('POST /api/tandas/:id/advance', () => {
  it('advances the round', async () => {
    const app = makeApp();
    const organizer = await createUser(app, 'org@example.com', 'Organizer');
    const m1 = await createUser(app, 'm1@example.com', 'M1');
    const m2 = await createUser(app, 'm2@example.com', 'M2');
    const tanda = await createTanda(app, organizer.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ requesterId: organizer.id });
    const res = await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ requesterId: organizer.id });
    expect(res.status).toBe(200);
    expect(res.body.data.currentRound).toBe(2);
  });

  it('auto-completes on last round', async () => {
    const app = makeApp();
    const organizer = await createUser(app, 'org@example.com', 'Organizer');
    const m1 = await createUser(app, 'm1@example.com', 'M1');
    const m2 = await createUser(app, 'm2@example.com', 'M2');
    const tanda = await createTanda(app, organizer.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ requesterId: organizer.id });
    // advance to last round twice (3 total rounds, start = 1)
    await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ requesterId: organizer.id });
    await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ requesterId: organizer.id });
    const res = await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ requesterId: organizer.id });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });
});

describe('POST /api/tandas/:id/contributions', () => {
  it('records a contribution', async () => {
    const app = makeApp();
    const organizer = await createUser(app, 'org@example.com', 'Organizer');
    const m1 = await createUser(app, 'm1@example.com', 'M1');
    const m2 = await createUser(app, 'm2@example.com', 'M2');
    const tanda = await createTanda(app, organizer.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ requesterId: organizer.id });

    // Get participant id for organizer
    const partsRes = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const orgParticipant = (partsRes.body.data as Array<{ userId: string; id: string }>).find(
      (p) => p.userId === organizer.id,
    );

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: orgParticipant?.id, amount: 1000 });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('paid');
  });

  it('marks contribution as late when amount is less than expected', async () => {
    const app = makeApp();
    const organizer = await createUser(app, 'org@example.com', 'Organizer');
    const m1 = await createUser(app, 'm1@example.com', 'M1');
    const m2 = await createUser(app, 'm2@example.com', 'M2');
    const tanda = await createTanda(app, organizer.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ requesterId: organizer.id });

    const partsRes = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const orgParticipant = (partsRes.body.data as Array<{ userId: string; id: string }>).find(
      (p) => p.userId === organizer.id,
    );

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: orgParticipant?.id, amount: 500 });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('late');
  });

  it('returns 409 when contribution already recorded', async () => {
    const app = makeApp();
    const organizer = await createUser(app, 'org@example.com', 'Organizer');
    const m1 = await createUser(app, 'm1@example.com', 'M1');
    const m2 = await createUser(app, 'm2@example.com', 'M2');
    const tanda = await createTanda(app, organizer.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ requesterId: organizer.id });

    const partsRes = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const orgParticipant = (partsRes.body.data as Array<{ userId: string; id: string }>).find(
      (p) => p.userId === organizer.id,
    );

    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: orgParticipant?.id, amount: 1000 });

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: orgParticipant?.id, amount: 1000 });
    expect(res.status).toBe(409);
  });
});

describe('GET /api/tandas/:id/rounds/:round', () => {
  it('returns round summary', async () => {
    const app = makeApp();
    const organizer = await createUser(app, 'org@example.com', 'Organizer');
    const m1 = await createUser(app, 'm1@example.com', 'M1');
    const m2 = await createUser(app, 'm2@example.com', 'M2');
    const tanda = await createTanda(app, organizer.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ requesterId: organizer.id });

    const partsRes = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const orgParticipant = (partsRes.body.data as Array<{ userId: string; id: string }>).find(
      (p) => p.userId === organizer.id,
    );

    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: orgParticipant?.id, amount: 1000 });

    const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/1`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('GET /api/tandas/:id/participants/:pid/history', () => {
  it('returns contribution history for a participant', async () => {
    const app = makeApp();
    const organizer = await createUser(app, 'org@example.com', 'Organizer');
    const m1 = await createUser(app, 'm1@example.com', 'M1');
    const m2 = await createUser(app, 'm2@example.com', 'M2');
    const tanda = await createTanda(app, organizer.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ requesterId: organizer.id });

    const partsRes = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const orgParticipant = (partsRes.body.data as Array<{ userId: string; id: string }>).find(
      (p) => p.userId === organizer.id,
    );

    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: orgParticipant?.id, amount: 1000 });

    const res = await request(app).get(`/api/tandas/${tanda.id}/participants/${orgParticipant?.id}/history`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('returns 404 for unknown participant', async () => {
    const app = makeApp();
    const organizer = await createUser(app);
    const tanda = await createTanda(app, organizer.id);
    const res = await request(app).get(
      `/api/tandas/${tanda.id}/participants/00000000-0000-0000-0000-000000000000/history`,
    );
    expect(res.status).toBe(404);
  });
});

describe('GET /health', () => {
  it('returns ok', async () => {
    const app = makeApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
