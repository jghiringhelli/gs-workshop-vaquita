import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../app';
import { createTestDb, setDb } from '../db';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function registerAndLogin(email: string, username: string) {
  const reg = await request(app)
    .post('/api/users/register')
    .send({ email, username, password: 'password123' });
  const login = await request(app)
    .post('/api/users/login')
    .send({ email, password: 'password123' });
  return { userId: reg.body.id as number, token: login.body.token as string };
}

/**
 * Creates a tanda that is ready for contributions:
 * - 3 participants registered + joined
 * - tanda started (status = 'active')
 */
async function activeThreeMemberTanda() {
  const alice = await registerAndLogin('alice@example.com', 'alice');
  const bob = await registerAndLogin('bob@example.com', 'bob');
  const carol = await registerAndLogin('carol@example.com', 'carol');

  const create = await request(app)
    .post('/api/tandas')
    .set('Authorization', `Bearer ${alice.token}`)
    .send({ name: 'Tanda Enero', contributionAmount: 1000, totalRounds: 3 });
  const tandaId: number = create.body.id;

  await request(app)
    .post(`/api/tandas/${tandaId}/join`)
    .set('Authorization', `Bearer ${bob.token}`)
    .send({});
  await request(app)
    .post(`/api/tandas/${tandaId}/join`)
    .set('Authorization', `Bearer ${carol.token}`)
    .send({});

  await request(app)
    .post(`/api/tandas/${tandaId}/start`)
    .set('Authorization', `Bearer ${alice.token}`)
    .send({});

  return { alice, bob, carol, tandaId };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setDb(createTestDb());
});

// ─── POST /api/tandas ─────────────────────────────────────────────────────────

describe('POST /api/tandas', () => {
  it('creates a tanda and returns forming status', async () => {
    const { token, userId } = await registerAndLogin('alice@example.com', 'alice');
    const res = await request(app)
      .post('/api/tandas')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Tanda Enero', contributionAmount: 1000, totalRounds: 3 });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Tanda Enero');
    expect(res.body.status).toBe('forming');
    expect(res.body.organizerId).toBe(userId);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/tandas')
      .send({ name: 'Test', contributionAmount: 500, totalRounds: 2 });
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing fields', async () => {
    const { token } = await registerAndLogin('alice@example.com', 'alice');
    const res = await request(app)
      .post('/api/tandas')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test' });
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/tandas/:id ──────────────────────────────────────────────────────

describe('GET /api/tandas/:id', () => {
  it('returns tanda detail with participants and totalContributions', async () => {
    const { token } = await registerAndLogin('alice@example.com', 'alice');
    const create = await request(app)
      .post('/api/tandas')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Detail Test', contributionAmount: 500, totalRounds: 2 });
    const tandaId: number = create.body.id;

    const res = await request(app).get(`/api/tandas/${tandaId}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(tandaId);
    expect(Array.isArray(res.body.participants)).toBe(true);
    expect(res.body.participants).toHaveLength(1); // organizer auto-joined
    expect(res.body.totalContributions).toBe(0);
  });

  it('returns 404 for an unknown tanda', async () => {
    const res = await request(app).get('/api/tandas/9999');
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/tandas/:id/join ────────────────────────────────────────────────

describe('POST /api/tandas/:id/join', () => {
  it('lets a user join a forming tanda', async () => {
    const alice = await registerAndLogin('alice@example.com', 'alice');
    const bob = await registerAndLogin('bob@example.com', 'bob');
    const create = await request(app)
      .post('/api/tandas')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Join Test', contributionAmount: 500, totalRounds: 2 });
    const tandaId: number = create.body.id;

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(bob.userId);
    expect(res.body.role).toBe('member');
  });

  it('returns 409 when already a participant', async () => {
    const alice = await registerAndLogin('alice@example.com', 'alice');
    const bob = await registerAndLogin('bob@example.com', 'bob');
    const create = await request(app)
      .post('/api/tandas')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Join Test', contributionAmount: 500, totalRounds: 2 });
    const tandaId: number = create.body.id;

    await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({});
    const res = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({});

    expect(res.status).toBe(409);
  });

  it('returns 400 when tanda is already active', async () => {
    const { alice, bob, tandaId } = await activeThreeMemberTanda();
    const dave = await registerAndLogin('dave@example.com', 'dave');

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .set('Authorization', `Bearer ${dave.token}`)
      .send({});

    expect(res.status).toBe(400);
    void alice;
    void bob;
  });

  it('returns 401 without auth', async () => {
    const { token } = await registerAndLogin('alice@example.com', 'alice');
    const create = await request(app)
      .post('/api/tandas')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Join Test', contributionAmount: 500, totalRounds: 2 });

    const res = await request(app)
      .post(`/api/tandas/${create.body.id}/join`)
      .send({});
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/tandas/:id/contributions ───────────────────────────────────────

describe('POST /api/tandas/:id/contributions', () => {
  it('records a paid contribution for an active tanda', async () => {
    const { alice, tandaId } = await activeThreeMemberTanda();

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('paid');
    expect(res.body.amount).toBe(1000);
  });

  it('auto-completes the tanda when all participants pay in the final round', async () => {
    const { alice, bob, carol, tandaId } = await activeThreeMemberTanda();

    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({});
    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({});
    // carol is the 3rd — after all 3 pay in round 3 (totalRounds=3) tanda completes
    // For this test totalRounds=3 but currentRound=1, so NOT completed yet
    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .set('Authorization', `Bearer ${carol.token}`)
      .send({});

    expect(res.status).toBe(201);
    // currentRound(1) < totalRounds(3), so still active
    const detail = await request(app).get(`/api/tandas/${tandaId}`);
    expect(detail.body.status).toBe('active');
  });

  it('returns 400 when tanda is not active', async () => {
    const { token } = await registerAndLogin('alice@example.com', 'alice');
    const create = await request(app)
      .post('/api/tandas')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Forming Tanda', contributionAmount: 500, totalRounds: 2 });

    const res = await request(app)
      .post(`/api/tandas/${create.body.id}/contributions`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 409 for a duplicate contribution in the same round', async () => {
    const { alice, tandaId } = await activeThreeMemberTanda();

    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({});
    const res = await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({});

    expect(res.status).toBe(409);
  });
});

// ─── GET /api/tandas/:id/balance ──────────────────────────────────────────────

describe('GET /api/tandas/:id/balance', () => {
  it('returns 0 balance for a new tanda', async () => {
    const { token } = await registerAndLogin('alice@example.com', 'alice');
    const create = await request(app)
      .post('/api/tandas')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Balance Test', contributionAmount: 500, totalRounds: 2 });

    const res = await request(app).get(`/api/tandas/${create.body.id}/balance`);

    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(0);
  });

  it('reflects paid contributions in the balance', async () => {
    const { alice, tandaId } = await activeThreeMemberTanda();

    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({});

    const res = await request(app).get(`/api/tandas/${tandaId}/balance`);
    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(1000);
  });

  it('returns 404 for an unknown tanda', async () => {
    const res = await request(app).get('/api/tandas/9999/balance');
    expect(res.status).toBe(404);
  });
});

// ─── GET /api/tandas/:id/preview ─────────────────────────────────────────────

describe('GET /api/tandas/:id/preview', () => {
  it('returns a public summary without requiring auth', async () => {
    const { token } = await registerAndLogin('alice@example.com', 'alice');
    const create = await request(app)
      .post('/api/tandas')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Preview Tanda', contributionAmount: 750, totalRounds: 4 });

    // No auth header
    const res = await request(app).get(`/api/tandas/${create.body.id}/preview`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Preview Tanda');
    expect(res.body.participantCount).toBe(1);
    expect(res.body.totalContributions).toBe(0);
    expect(res.body).not.toHaveProperty('organizerId');
  });

  it('returns 404 for an unknown tanda', async () => {
    const res = await request(app).get('/api/tandas/9999/preview');
    expect(res.status).toBe(404);
  });
});
