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
  return res.body as { id: string };
}

async function setupActiveTanda() {
  const [org, m1, m2] = await Promise.all([
    createUser('org@test.com', 'Organizer'),
    createUser('m1@test.com', 'Member1'),
    createUser('m2@test.com', 'Member2'),
  ]);

  const tandaRes = await request(app)
    .post('/api/tandas')
    .send({ name: 'Tanda Test', organizerId: org.id, contributionAmount: 1000 });
  const tanda = tandaRes.body as { id: string };

  await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
  await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
  await request(app).post(`/api/tandas/${tanda.id}/start`).send({ organizerId: org.id });

  const partRes = await request(app).get(`/api/tandas/${tanda.id}/participants`);
  const participants = partRes.body as Array<{ id: string; consecutiveMissed: number; isDefaulter: boolean }>;

  return { tanda, org, participants };
}

// ── POST /api/tandas/:id/contributions ───────────────────────────────────────

describe('POST /api/tandas/:id/contributions', () => {
  it('records a paid contribution at base amount', async () => {
    const { tanda, participants } = await setupActiveTanda();
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: participants[0].id, status: 'paid' });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(1000);
    expect(res.body.status).toBe('paid');
    expect(res.body.round).toBe(1);
  });

  it('applies 5% penalty for late contributions', async () => {
    const { tanda, participants } = await setupActiveTanda();
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: participants[0].id, status: 'late' });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(1050);
    expect(res.body.status).toBe('late');
  });

  it('records a missed contribution without penalty', async () => {
    const { tanda, participants } = await setupActiveTanda();
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: participants[0].id, status: 'missed' });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(1000);
    expect(res.body.status).toBe('missed');
  });

  it('defaults status to "paid" when omitted', async () => {
    const { tanda, participants } = await setupActiveTanda();
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: participants[0].id });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('paid');
  });

  it('returns 409 for duplicate contribution in the same round', async () => {
    const { tanda, participants } = await setupActiveTanda();
    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: participants[0].id, status: 'paid' });

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: participants[0].id, status: 'paid' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('CONFLICT');
  });

  it('returns 422 for a non-active tanda', async () => {
    const org = await createUser('org2@test.com', 'Org2');
    const tandaRes = await request(app)
      .post('/api/tandas')
      .send({ name: 'Forming', organizerId: org.id, contributionAmount: 100 });

    const res = await request(app)
      .post(`/api/tandas/${tandaRes.body.id}/contributions`)
      .send({ participantId: '00000000-0000-0000-0000-000000000000', status: 'paid' });

    expect(res.status).toBe(422);
  });

  it('returns 404 for unknown participant', async () => {
    const { tanda } = await setupActiveTanda();
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: '00000000-0000-0000-0000-000000000000', status: 'paid' });

    expect(res.status).toBe(404);
  });

  it('flags participant as defaulter after 2 consecutive missed contributions', async () => {
    const { tanda, org, participants } = await setupActiveTanda();
    const pid = participants[0].id;

    // Round 1 — missed
    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: pid, status: 'missed' });
    await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ organizerId: org.id });

    // Round 2 — missed again
    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: pid, status: 'missed' });

    const partRes = await request(app).get(`/api/tandas/${tanda.id}/participants`);
    const updated = partRes.body.find((p: { id: string }) => p.id === pid);

    expect(updated.isDefaulter).toBe(true);
  });
});

// ── GET /api/tandas/:id/rounds/:round ─────────────────────────────────────────

describe('GET /api/tandas/:id/rounds/:round', () => {
  it('returns round summary with contributions and expected total', async () => {
    const { tanda, participants } = await setupActiveTanda();
    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: participants[0].id, status: 'paid' });

    const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/1`);

    expect(res.status).toBe(200);
    expect(res.body.round).toBe(1);
    expect(res.body.contributions).toHaveLength(1);
    expect(res.body.totalExpected).toBe(3000); // 3 participants × 1000
    expect(res.body.totalPaid).toBe(1000);
    expect(res.body.recipientParticipantId).toBeDefined();
  });

  it('returns 422 for out-of-range round number', async () => {
    const { tanda } = await setupActiveTanda();
    const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/99`);
    expect(res.status).toBe(422);
  });

  it('returns 404 for unknown tanda', async () => {
    const res = await request(app).get(
      '/api/tandas/00000000-0000-0000-0000-000000000000/rounds/1',
    );
    expect(res.status).toBe(404);
  });
});

// ── GET /api/tandas/:id/participants/:pid/history ─────────────────────────────

describe('GET /api/tandas/:id/participants/:pid/history', () => {
  it('returns all contributions for a participant', async () => {
    const { tanda, org, participants } = await setupActiveTanda();
    const pid = participants[0].id;

    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: pid, status: 'paid' });
    await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ organizerId: org.id });
    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .send({ participantId: pid, status: 'late' });

    const res = await request(app).get(
      `/api/tandas/${tanda.id}/participants/${pid}/history`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].status).toBe('paid');
    expect(res.body[1].status).toBe('late');
  });

  it('returns 404 for unknown participant', async () => {
    const { tanda } = await setupActiveTanda();
    const res = await request(app).get(
      `/api/tandas/${tanda.id}/participants/00000000-0000-0000-0000-000000000000/history`,
    );
    expect(res.status).toBe(404);
  });

  it('returns 404 for unknown tanda', async () => {
    const res = await request(app).get(
      '/api/tandas/00000000-0000-0000-0000-000000000000/participants/00000000-0000-0000-0000-000000000001/history',
    );
    expect(res.status).toBe(404);
  });
});
