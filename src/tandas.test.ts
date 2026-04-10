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

async function createUser(email: string, name: string) {
  const res = await request(app).post('/api/users').send({ email, name });
  return res.body;
}

async function createTanda(organizerId: string, name = 'Test Tanda', amount = 100) {
  const res = await request(app).post('/api/tandas').send({ name, organizerId, contributionAmount: amount });
  return res.body;
}

describe('Tandas API', () => {
  it('POST /api/tandas - creates a tanda', async () => {
    const user = await createUser('alice@example.com', 'Alice');
    const res = await request(app).post('/api/tandas').send({
      name: 'My Tanda',
      organizerId: user.id,
      contributionAmount: 100,
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('forming');
    expect(res.body.organizerId).toBe(user.id);
  });

  it('POST /api/tandas - auto-adds organizer as participant', async () => {
    const user = await createUser('alice@example.com', 'Alice');
    const tanda = await createTanda(user.id);
    const res = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].role).toBe('organizer');
    expect(res.body[0].userId).toBe(user.id);
  });

  it('GET /api/tandas?userId= - lists user tandas', async () => {
    const alice = await createUser('alice@example.com', 'Alice');
    const bob = await createUser('bob@example.com', 'Bob');
    await createTanda(alice.id, 'Alice Tanda');
    await createTanda(bob.id, 'Bob Tanda');
    const res = await request(app).get(`/api/tandas?userId=${alice.id}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('Alice Tanda');
  });

  it('POST /api/tandas/:id/join - joins a tanda', async () => {
    const alice = await createUser('alice@example.com', 'Alice');
    const bob = await createUser('bob@example.com', 'Bob');
    const tanda = await createTanda(alice.id);
    const res = await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: bob.id });
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(bob.id);
    expect(res.body.role).toBe('member');
  });

  it('POST /api/tandas/:id/join - prevents duplicate join', async () => {
    const alice = await createUser('alice@example.com', 'Alice');
    const bob = await createUser('bob@example.com', 'Bob');
    const tanda = await createTanda(alice.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: bob.id });
    const res = await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: bob.id });
    expect(res.status).toBe(409);
  });

  it('POST /api/tandas/:id/start - requires 3 participants', async () => {
    const alice = await createUser('alice@example.com', 'Alice');
    const bob = await createUser('bob@example.com', 'Bob');
    const tanda = await createTanda(alice.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: bob.id });
    const res = await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: alice.id });
    expect(res.status).toBe(400);
  });

  it('POST /api/tandas/:id/start - starts tanda with enough participants', async () => {
    const alice = await createUser('alice@example.com', 'Alice');
    const bob = await createUser('bob@example.com', 'Bob');
    const carol = await createUser('carol@example.com', 'Carol');
    const tanda = await createTanda(alice.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: bob.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: carol.id });
    const res = await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: alice.id });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
    expect(res.body.totalRounds).toBe(3);
    expect(res.body.currentRound).toBe(1);
  });

  it('POST /api/tandas/:id/start - only organizer can start', async () => {
    const alice = await createUser('alice@example.com', 'Alice');
    const bob = await createUser('bob@example.com', 'Bob');
    const carol = await createUser('carol@example.com', 'Carol');
    const tanda = await createTanda(alice.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: bob.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: carol.id });
    const res = await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: bob.id });
    expect(res.status).toBe(403);
  });

  it('POST /api/tandas/:id/cancel - cancels tanda', async () => {
    const alice = await createUser('alice@example.com', 'Alice');
    const tanda = await createTanda(alice.id);
    const res = await request(app).post(`/api/tandas/${tanda.id}/cancel`).send({ organizerId: alice.id });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('POST /api/tandas/:id/advance - advances to next round', async () => {
    const alice = await createUser('alice@example.com', 'Alice');
    const bob = await createUser('bob@example.com', 'Bob');
    const carol = await createUser('carol@example.com', 'Carol');
    const tanda = await createTanda(alice.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: bob.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: carol.id });
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: alice.id });

    const partsRes = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const participants = partsRes.body;

    for (const p of participants) {
      await request(app).post(`/api/tandas/${tanda.id}/contributions`).send({ participantId: p.id, amount: 100 });
    }

    const res = await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ organizerId: alice.id });
    expect(res.status).toBe(200);
    expect(res.body.currentRound).toBe(2);
  });

  it('POST /api/tandas/:id/advance - auto-completes on last round', async () => {
    const alice = await createUser('alice@example.com', 'Alice');
    const bob = await createUser('bob@example.com', 'Bob');
    const carol = await createUser('carol@example.com', 'Carol');
    const tanda = await createTanda(alice.id);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: bob.id });
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: carol.id });
    await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: alice.id });

    const partsRes = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const participants = partsRes.body;

    for (let round = 0; round < 3; round++) {
      for (const p of participants) {
        await request(app).post(`/api/tandas/${tanda.id}/contributions`).send({ participantId: p.id, amount: 100 });
      }
      await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ organizerId: alice.id });
    }

    const res = await request(app).get(`/api/tandas/${tanda.id}`);
    expect(res.body.status).toBe('completed');
  });
});
