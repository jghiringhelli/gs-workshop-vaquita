import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { resetDb, closeDb } from './db/database';

const app = createApp();

beforeEach(() => {
  resetDb();
});

afterAll(() => {
  closeDb();
});

async function setupActiveTanda() {
  const alice = (await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice' })).body;
  const bob = (await request(app).post('/api/users').send({ email: 'bob@example.com', name: 'Bob' })).body;
  const carol = (await request(app).post('/api/users').send({ email: 'carol@example.com', name: 'Carol' })).body;
  const tanda = (await request(app).post('/api/tandas').send({ name: 'Test', organizerId: alice.id, contributionAmount: 100 })).body;
  await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: bob.id });
  await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: carol.id });
  await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: alice.id });
  const participants = (await request(app).get(`/api/tandas/${tanda.id}/participants`)).body;
  return { alice, bob, carol, tanda, participants };
}

describe('Contributions API', () => {
  it('POST /api/tandas/:id/contributions - records a contribution', async () => {
    const { tanda, participants } = await setupActiveTanda();
    const res = await request(app).post(`/api/tandas/${tanda.id}/contributions`).send({
      participantId: participants[0].id,
      amount: 100,
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('paid');
    expect(res.body.round).toBe(1);
  });

  it('POST /api/tandas/:id/contributions - prevents duplicate contribution', async () => {
    const { tanda, participants } = await setupActiveTanda();
    await request(app).post(`/api/tandas/${tanda.id}/contributions`).send({ participantId: participants[0].id, amount: 100 });
    const res = await request(app).post(`/api/tandas/${tanda.id}/contributions`).send({ participantId: participants[0].id, amount: 100 });
    expect(res.status).toBe(409);
  });

  it('GET /api/tandas/:id/rounds/:round - returns round summary', async () => {
    const { tanda, participants } = await setupActiveTanda();
    await request(app).post(`/api/tandas/${tanda.id}/contributions`).send({ participantId: participants[0].id, amount: 100 });
    const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/1`);
    expect(res.status).toBe(200);
    expect(res.body.round).toBe(1);
    expect(res.body.contributions.length).toBe(1);
    expect(res.body.contributions[0].participant).toBeDefined();
  });

  it('GET /api/tandas/:id/participants/:pid/history - returns contribution history', async () => {
    const { tanda, participants } = await setupActiveTanda();
    const p = participants[0];
    await request(app).post(`/api/tandas/${tanda.id}/contributions`).send({ participantId: p.id, amount: 100 });
    const res = await request(app).get(`/api/tandas/${tanda.id}/participants/${p.id}/history`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });

  it('advance - auto-creates missed contributions', async () => {
    const { tanda, participants, alice } = await setupActiveTanda();
    await request(app).post(`/api/tandas/${tanda.id}/contributions`).send({ participantId: participants[0].id, amount: 100 });
    await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ organizerId: alice.id });
    const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/1`);
    expect(res.body.contributions.length).toBe(3);
    const missed = res.body.contributions.filter((c: { status: string }) => c.status === 'missed');
    expect(missed.length).toBe(2);
  });
});
