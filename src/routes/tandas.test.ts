process.env.NODE_ENV = 'test';

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { db } from '../db';

beforeEach(() => {
  db.exec('DELETE FROM contributions');
  db.exec('DELETE FROM participants');
  db.exec('DELETE FROM tandas');
  db.exec('DELETE FROM users');
});

// Helper: create a user
async function createUser(email: string, name: string) {
  const res = await request(app).post('/api/users').send({ email, name });
  return res.body as { id: string; email: string; name: string };
}

// Helper: create a tanda with organizer
async function createTanda(organizerId: string, name = 'Test Tanda', amount = 100) {
  const res = await request(app).post('/api/tandas').send({ name, organizerId, contributionAmount: amount });
  return res.body as { id: string; organizerId: string; status: string };
}

// Helper: set up a tanda with N total members (organizer + members)
async function setupActiveTanda(totalMembers = 3) {
  const organizer = await createUser('organizer@test.com', 'Organizer');
  const tanda = await createTanda(organizer.id);
  const members = [];
  for (let i = 1; i < totalMembers; i++) {
    const user = await createUser(`member${i}@test.com`, `Member ${i}`);
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: user.id });
    members.push(user);
  }
  await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: organizer.id });
  return { organizer, tanda, members };
}

describe('POST /api/tandas', () => {
  it('creates a tanda with organizer as participant', async () => {
    const user = await createUser('org@test.com', 'Org');
    const res = await request(app).post('/api/tandas').send({
      name: 'My Tanda',
      organizerId: user.id,
      contributionAmount: 500,
    });
    expect(res.status).toBe(201);
    expect(res.body.organizerId).toBe(user.id);
    expect(res.body.status).toBe('forming');
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/api/tandas').send({ name: 'No Org' });
    expect(res.status).toBe(400);
  });

  it('returns 404 if organizer user does not exist', async () => {
    const res = await request(app).post('/api/tandas').send({
      name: 'Tanda',
      organizerId: '00000000-0000-0000-0000-000000000000',
      contributionAmount: 100,
    });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/tandas', () => {
  it('returns all tandas', async () => {
    const user = await createUser('x@test.com', 'X');
    await createTanda(user.id);
    const res = await request(app).get('/api/tandas');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('filters tandas by userId', async () => {
    const user = await createUser('y@test.com', 'Y');
    await createTanda(user.id);
    const res = await request(app).get(`/api/tandas?userId=${user.id}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/tandas/:id', () => {
  it('returns tanda by id', async () => {
    const user = await createUser('z@test.com', 'Z');
    const tanda = await createTanda(user.id);
    const res = await request(app).get(`/api/tandas/${tanda.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(tanda.id);
  });

  it('returns 404 for unknown tanda', async () => {
    const res = await request(app).get('/api/tandas/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/tandas/:id/join', () => {
  it('allows a user to join a forming tanda', async () => {
    const org = await createUser('org2@test.com', 'Org2');
    const tanda = await createTanda(org.id);
    const member = await createUser('member@test.com', 'Member');
    const res = await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member.id });
    expect(res.status).toBe(201);
  });

  it('returns 409 if user already joined', async () => {
    const org = await createUser('org3@test.com', 'Org3');
    const tanda = await createTanda(org.id);
    const member = await createUser('m2@test.com', 'M2');
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member.id });
    const res = await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: member.id });
    expect(res.status).toBe(409);
  });

  it('returns 409 if tanda is not forming', async () => {
    const { organizer, tanda } = await setupActiveTanda(3);
    const newUser = await createUser('late@test.com', 'Late');
    const res = await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: newUser.id });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/tandas/:id/start', () => {
  it('starts a tanda with 3+ participants', async () => {
    const org = await createUser('org4@test.com', 'Org4');
    const tanda = await createTanda(org.id);
    for (let i = 0; i < 2; i++) {
      const u = await createUser(`sm${i}@test.com`, `SM${i}`);
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: u.id });
    }
    const res = await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: org.id });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
  });

  it('returns 400 with fewer than 3 participants', async () => {
    const org = await createUser('org5@test.com', 'Org5');
    const tanda = await createTanda(org.id);
    const u = await createUser('only1@test.com', 'Only1');
    await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: u.id });
    const res = await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: org.id });
    expect(res.status).toBe(400);
  });

  it('returns 403 if non-organizer tries to start', async () => {
    const org = await createUser('org6@test.com', 'Org6');
    const tanda = await createTanda(org.id);
    const res = await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/tandas/:id/cancel', () => {
  it('cancels a forming tanda', async () => {
    const org = await createUser('org7@test.com', 'Org7');
    const tanda = await createTanda(org.id);
    const res = await request(app).post(`/api/tandas/${tanda.id}/cancel`).send({ organizerId: org.id });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('returns 403 if non-organizer tries to cancel', async () => {
    const org = await createUser('org8@test.com', 'Org8');
    const tanda = await createTanda(org.id);
    const res = await request(app).post(`/api/tandas/${tanda.id}/cancel`).send({ organizerId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/tandas/:id/participants', () => {
  it('lists participants of a tanda', async () => {
    const org = await createUser('org9@test.com', 'Org9');
    const tanda = await createTanda(org.id);
    const res = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1); // organizer auto-added
  });

  it('returns 404 for unknown tanda', async () => {
    const res = await request(app).get('/api/tandas/00000000-0000-0000-0000-000000000000/participants');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/tandas/:id/contributions', () => {
  it('records a contribution for active tanda', async () => {
    const { tanda } = await setupActiveTanda(3);
    const parts = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const participant = parts.body[0];
    const res = await request(app).post(`/api/tandas/${tanda.id}/contributions`).send({
      participantId: participant.id,
      amount: 100,
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('paid');
  });

  it('returns 409 for duplicate contribution', async () => {
    const { tanda } = await setupActiveTanda(3);
    const parts = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const participant = parts.body[0];
    await request(app).post(`/api/tandas/${tanda.id}/contributions`).send({ participantId: participant.id, amount: 100 });
    const res = await request(app).post(`/api/tandas/${tanda.id}/contributions`).send({ participantId: participant.id, amount: 100 });
    expect(res.status).toBe(409);
  });
});

describe('GET /api/tandas/:id/rounds/:round', () => {
  it('returns round summary', async () => {
    const { tanda } = await setupActiveTanda(3);
    const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/1`);
    expect(res.status).toBe(200);
    expect(res.body.round).toBe(1);
  });

  it('returns 404 for unknown tanda', async () => {
    const res = await request(app).get('/api/tandas/00000000-0000-0000-0000-000000000000/rounds/1');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/tandas/:id/advance', () => {
  it('advances the round', async () => {
    const { organizer, tanda } = await setupActiveTanda(3);
    const res = await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ organizerId: organizer.id });
    expect(res.status).toBe(200);
    expect(res.body.currentRound).toBe(2);
  });

  it('returns 403 for non-organizer', async () => {
    const { tanda } = await setupActiveTanda(3);
    const res = await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ organizerId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/tandas/:id/participants/:pid/history', () => {
  it('returns empty array when participant has no contributions yet', async () => {
    const { tanda } = await setupActiveTanda(3);
    const parts = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const participant = parts.body[0];
    const res = await request(app).get(`/api/tandas/${tanda.id}/participants/${participant.id}/history`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('returns a single paid contribution after recording one', async () => {
    const { tanda } = await setupActiveTanda(3);
    const parts = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const participant = parts.body[0];

    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: participant.id, amount: 100 });

    const res = await request(app).get(`/api/tandas/${tanda.id}/participants/${participant.id}/history`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);

    const entry = res.body[0];
    expect(entry.participantId).toBe(participant.id);
    expect(entry.tandaId).toBe(tanda.id);
    expect(entry.round).toBe(1);
    expect(entry.status).toBe('paid');
    expect(entry.amount).toBe(100);
    expect(entry).toHaveProperty('id');
  });

  it('records contributions across multiple rounds and returns full history', async () => {
    const { organizer, tanda } = await setupActiveTanda(3);
    const parts = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const participant = parts.body[0];

    // Round 1 — pay
    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: participant.id, amount: 100 });

    // Advance to round 2
    await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .send({ organizerId: organizer.id });

    // Round 2 — pay again
    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: participant.id, amount: 100 });

    const res = await request(app).get(`/api/tandas/${tanda.id}/participants/${participant.id}/history`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);

    const rounds = res.body.map((c: { round: number }) => c.round).sort();
    expect(rounds).toEqual([1, 2]);
    expect(res.body.every((c: { status: string }) => c.status === 'paid')).toBe(true);
  });

  it('shows missed status for a round where participant did not pay before advance', async () => {
    const { organizer, tanda } = await setupActiveTanda(3);
    const parts = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const participant = parts.body[0];

    // Do NOT pay in round 1 — advance immediately
    await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .send({ organizerId: organizer.id });

    const res = await request(app).get(`/api/tandas/${tanda.id}/participants/${participant.id}/history`);
    expect(res.status).toBe(200);

    const missed = res.body.find((c: { round: number }) => c.round === 1);
    expect(missed).toBeDefined();
    expect(missed.status).toBe('missed');
    expect(missed.amount).toBe(0);
  });

  it('shows late status and applies penalty when amount is below contribution amount', async () => {
    const { tanda } = await setupActiveTanda(3);
    const parts = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const participant = parts.body[0];

    // Tanda contributionAmount is 100; pay only 50 → triggers late + 5% penalty
    const contribRes = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: participant.id, amount: 50 });
    expect(contribRes.body.status).toBe('late');

    const res = await request(app).get(`/api/tandas/${tanda.id}/participants/${participant.id}/history`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);

    const entry = res.body[0];
    expect(entry.status).toBe('late');
    expect(entry.amount).toBeCloseTo(50 * 1.05, 5); // 5% penalty applied
  });

  it('history entries have all required fields', async () => {
    const { tanda } = await setupActiveTanda(3);
    const parts = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const participant = parts.body[0];

    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: participant.id, amount: 100 });

    const res = await request(app).get(`/api/tandas/${tanda.id}/participants/${participant.id}/history`);
    const entry = res.body[0];

    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('tandaId');
    expect(entry).toHaveProperty('participantId');
    expect(entry).toHaveProperty('round');
    expect(entry).toHaveProperty('amount');
    expect(entry).toHaveProperty('status');
  });

  it('returns 404 for unknown participant id', async () => {
    const org = await createUser('horg@test.com', 'HOrgH');
    const tanda = await createTanda(org.id);
    const res = await request(app).get(
      `/api/tandas/${tanda.id}/participants/00000000-0000-0000-0000-000000000000/history`,
    );
    expect(res.status).toBe(404);
  });

  it('returns 404 when tanda does not exist', async () => {
    const res = await request(app).get(
      `/api/tandas/00000000-0000-0000-0000-000000000000/participants/00000000-0000-0000-0000-000000000001/history`,
    );
    expect(res.status).toBe(404);
  });
});
