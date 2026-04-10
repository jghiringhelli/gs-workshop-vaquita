import { beforeEach, describe, it, expect } from 'vitest';

process.env.DATABASE_PATH = ':memory:';

import request from 'supertest';
import { app } from '../index';
import { resetDatabase } from '../db/database';

async function createUser(email: string, name: string) {
  const res = await request(app).post('/api/users').send({ email, name });
  return res.body;
}

async function createTanda(organizerId: number) {
  const res = await request(app).post('/api/tandas').send({
    name: 'Test Tanda',
    organizerId,
    contributionAmount: 100,
  });
  return res.body;
}

beforeEach(() => {
  resetDatabase();
});

describe('POST /api/tandas', () => {
  it('creates a tanda and auto-adds organizer', async () => {
    const user = await createUser('org@example.com', 'Organizer');
    const res = await request(app).post('/api/tandas').send({
      name: 'My Tanda',
      organizerId: user.id,
      contributionAmount: 500,
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('forming');
  });

  it('returns 404 if organizer does not exist', async () => {
    const res = await request(app).post('/api/tandas').send({
      name: 'Bad Tanda',
      organizerId: 9999,
      contributionAmount: 100,
    });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/tandas/:id/join', () => {
  it('allows a user to join a forming tanda', async () => {
    const org = await createUser('org2@example.com', 'Organizer');
    const member = await createUser('member@example.com', 'Member');
    const tanda = await createTanda(org.id);
    const res = await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member.id });
    expect(res.status).toBe(201);
  });

  it('returns 409 if user already in tanda', async () => {
    const org = await createUser('org3@example.com', 'Org3');
    const tanda = await createTanda(org.id);
    const res = await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: org.id });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/tandas/:id/start', () => {
  it('returns 400 with less than 3 participants', async () => {
    const org = await createUser('org4@example.com', 'Org4');
    const m1 = await createUser('m1@example.com', 'M1');
    const tanda = await createTanda(org.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
    const res = await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: org.id });
    expect(res.status).toBe(400);
  });

  it('starts with 3 participants', async () => {
    const org = await createUser('org5@example.com', 'Org5');
    const m1 = await createUser('m1b@example.com', 'M1B');
    const m2 = await createUser('m2b@example.com', 'M2B');
    const tanda = await createTanda(org.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
    const res = await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: org.id });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
    expect(res.body.currentRound).toBe(1);
  });
});

describe('POST /api/tandas/:id/contributions', () => {
  it('records a contribution', async () => {
    const org = await createUser('org6@example.com', 'Org6');
    const m1 = await createUser('m1c@example.com', 'M1C');
    const m2 = await createUser('m2c@example.com', 'M2C');
    const tanda = await createTanda(org.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: org.id });
    
    const parts = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const participant = parts.body[0];
    
    const res = await request(app).post(`/api/tandas/${tanda.id}/contributions`).send({
      participantId: participant.id,
      amount: 100,
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('paid');
  });
});

describe('POST /api/tandas/:id/advance', () => {
  it('advances the round', async () => {
    const org = await createUser('org7@example.com', 'Org7');
    const m1 = await createUser('m1d@example.com', 'M1D');
    const m2 = await createUser('m2d@example.com', 'M2D');
    const tanda = await createTanda(org.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: org.id });
    const res = await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ organizerId: org.id });
    expect(res.status).toBe(200);
    expect(res.body.currentRound).toBeGreaterThanOrEqual(1);
  });
});

describe('POST /api/tandas/:id/cancel', () => {
  it('cancels a forming tanda', async () => {
    const org = await createUser('org8@example.com', 'Org8');
    const tanda = await createTanda(org.id);
    const res = await request(app).post(`/api/tandas/${tanda.id}/cancel`).send({ organizerId: org.id });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('returns 403 if not organizer', async () => {
    const org = await createUser('org9@example.com', 'Org9');
    const other = await createUser('other@example.com', 'Other');
    const tanda = await createTanda(org.id);
    const res = await request(app).post(`/api/tandas/${tanda.id}/cancel`).send({ organizerId: other.id });
    expect(res.status).toBe(403);
  });
});
