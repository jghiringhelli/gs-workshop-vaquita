import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../index';
import { resetDb } from '../test/helpers';

beforeEach(resetDb);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function createUser(email: string) {
  const name = email.split('@')[0];
  const reg = await request(app)
    .post('/api/users/register')
    .send({ email, username: name, password: 'Password123' });
  const login = await request(app)
    .post('/api/users/login')
    .send({ email, password: 'Password123' });
  return { id: reg.body.id as number, token: login.body.token as string };
}

async function createPool(
  token: string,
  overrides: Record<string, unknown> = {},
) {
  return request(app)
    .post('/api/pools')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Pool', targetAmount: 100, currency: 'MXN', ...overrides });
}

// ─── POST /api/pools ──────────────────────────────────────────────────────────

describe('POST /api/pools', () => {
  it('creates a pool and auto-joins the organizer as a member', async () => {
    const { token, id } = await createUser('alice@example.com');
    const res = await createPool(token, { purpose: 'Vacation fund' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Test Pool',
      purpose: 'Vacation fund',
      status: 'open',
      currency: 'MXN',
      targetAmount: 100,
      organizerId: id,
    });
    expect(res.body.members).toHaveLength(1);
    expect(res.body.members[0].userId).toBe(id);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/pools')
      .send({ name: 'X', targetAmount: 100 });
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    const { token } = await createUser('alice@example.com');
    const res = await createPool(token, { name: '' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when targetAmount is zero', async () => {
    const { token } = await createUser('alice@example.com');
    const res = await createPool(token, { targetAmount: 0 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an unsupported currency', async () => {
    const { token } = await createUser('alice@example.com');
    const res = await createPool(token, { currency: 'XYZ' });
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/pools/:id ────────────────────────────────────────────────────────

describe('GET /api/pools/:id', () => {
  it('returns pool details with members and contributions', async () => {
    const { token } = await createUser('alice@example.com');
    const created = await createPool(token);
    const poolId = created.body.id;

    const res = await request(app)
      .get(`/api/pools/${poolId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(poolId);
    expect(res.body.members).toBeDefined();
    expect(res.body.contributions).toBeDefined();
  });

  it('returns 404 for a non-existent pool', async () => {
    const { token } = await createUser('alice@example.com');
    const res = await request(app)
      .get('/api/pools/99999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/pools/1');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/pools/:id/preview ───────────────────────────────────────────────

describe('GET /api/pools/:id/preview', () => {
  it('returns a public summary without authentication', async () => {
    const { token } = await createUser('alice@example.com');
    const created = await createPool(token, { targetAmount: 50, purpose: 'Trip' });
    const poolId = created.body.id;

    const res = await request(app).get(`/api/pools/${poolId}/preview`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: poolId,
      name: 'Test Pool',
      status: 'open',
      currency: 'MXN',
      targetAmountCents: 5000,
      totalContributionsCents: 0,
      memberCount: 1,
      progressPct: 0,
    });
    // must NOT expose sensitive member data
    expect(res.body.members).toBeUndefined();
    expect(res.body.contributions).toBeUndefined();
  });

  it('returns 404 for a non-existent pool', async () => {
    const res = await request(app).get('/api/pools/99999/preview');
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/pools/:id/invite ───────────────────────────────────────────────

describe('POST /api/pools/:id/invite', () => {
  it('organiser can invite a user who becomes a member', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    const created = await createPool(alice.token);
    const poolId = created.body.id;

    const res = await request(app)
      .post(`/api/pools/${poolId}/invite`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ userId: bob.id });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(bob.id);
  });

  it('returns 403 when a non-organiser tries to invite', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    const charlie = await createUser('charlie@example.com');
    const created = await createPool(alice.token);
    const poolId = created.body.id;

    const res = await request(app)
      .post(`/api/pools/${poolId}/invite`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ userId: charlie.id });

    expect(res.status).toBe(403);
  });

  it('returns 409 when the user is already a member', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    const created = await createPool(alice.token);
    const poolId = created.body.id;

    await request(app)
      .post(`/api/pools/${poolId}/invite`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ userId: bob.id });

    const res = await request(app)
      .post(`/api/pools/${poolId}/invite`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ userId: bob.id });

    expect(res.status).toBe(409);
  });

  it('returns 404 for a non-existent pool', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    const res = await request(app)
      .post('/api/pools/99999/invite')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ userId: bob.id });
    expect(res.status).toBe(404);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/pools/1/invite')
      .send({ userId: 1 });
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/pools/:id/contributions ────────────────────────────────────────

describe('POST /api/pools/:id/contributions', () => {
  it('member can record a contribution', async () => {
    const alice = await createUser('alice@example.com');
    const created = await createPool(alice.token, { targetAmount: 1000 });
    const poolId = created.body.id;

    const res = await request(app)
      .post(`/api/pools/${poolId}/contributions`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amountCents: 5000, note: 'First payment' });

    expect(res.status).toBe(201);
    expect(res.body.amountCents).toBe(5000);
  });

  it('auto-transitions pool to "funded" when target is reached', async () => {
    const alice = await createUser('alice@example.com');
    // targetAmount=10 MXN → targetCents=1000
    const created = await createPool(alice.token, { targetAmount: 10 });
    const poolId = created.body.id;

    await request(app)
      .post(`/api/pools/${poolId}/contributions`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amountCents: 1000 });

    const preview = await request(app).get(`/api/pools/${poolId}/preview`);
    expect(preview.body.status).toBe('funded');
    expect(preview.body.progressPct).toBe(100);
  });

  it('returns 422 when the pool is already funded (not open)', async () => {
    const alice = await createUser('alice@example.com');
    const created = await createPool(alice.token, { targetAmount: 10 });
    const poolId = created.body.id;

    // Fund the pool
    await request(app)
      .post(`/api/pools/${poolId}/contributions`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amountCents: 1000 });

    // Try to contribute again to funded pool
    const res = await request(app)
      .post(`/api/pools/${poolId}/contributions`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amountCents: 100 });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('BUSINESS_RULE_VIOLATION');
  });

  it('returns 403 when the user is not a member', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    const created = await createPool(alice.token);
    const poolId = created.body.id;

    const res = await request(app)
      .post(`/api/pools/${poolId}/contributions`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ amountCents: 500 });

    expect(res.status).toBe(403);
  });

  it('returns 400 when amountCents is not a positive integer', async () => {
    const alice = await createUser('alice@example.com');
    const created = await createPool(alice.token);
    const poolId = created.body.id;

    const res = await request(app)
      .post(`/api/pools/${poolId}/contributions`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amountCents: -50 });

    expect(res.status).toBe(400);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/pools/1/contributions')
      .send({ amountCents: 500 });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/pools/:id/balance ───────────────────────────────────────────────

describe('GET /api/pools/:id/balance', () => {
  it('returns balance equal to contributions minus approved withdrawals', async () => {
    const alice = await createUser('alice@example.com');
    const created = await createPool(alice.token, { targetAmount: 1000 });
    const poolId = created.body.id;

    await request(app)
      .post(`/api/pools/${poolId}/contributions`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amountCents: 3000 });

    await request(app)
      .post(`/api/pools/${poolId}/contributions`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amountCents: 2000 });

    const res = await request(app)
      .get(`/api/pools/${poolId}/balance`)
      .set('Authorization', `Bearer ${alice.token}`);

    expect(res.status).toBe(200);
    expect(res.body.contributionsCents).toBe(5000);
    expect(res.body.approvedWithdrawalsCents).toBe(0);
    expect(res.body.balanceCents).toBe(5000);
    expect(res.body.currency).toBe('MXN');
  });

  it('deducts approved withdrawals from the balance', async () => {
    const alice = await createUser('alice@example.com');
    const created = await createPool(alice.token, { targetAmount: 1000 });
    const poolId = created.body.id;

    await request(app)
      .post(`/api/pools/${poolId}/contributions`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amountCents: 10000 });

    const wRes = await request(app)
      .post(`/api/pools/${poolId}/withdrawals`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amountCents: 4000 });

    await request(app)
      .patch(`/api/pools/${poolId}/withdrawals/${wRes.body.id}/approve`)
      .set('Authorization', `Bearer ${alice.token}`);

    const balance = await request(app)
      .get(`/api/pools/${poolId}/balance`)
      .set('Authorization', `Bearer ${alice.token}`);

    expect(balance.body.contributionsCents).toBe(10000);
    expect(balance.body.approvedWithdrawalsCents).toBe(4000);
    expect(balance.body.balanceCents).toBe(6000);
  });

  it('returns 404 for a non-existent pool', async () => {
    const { token } = await createUser('alice@example.com');
    const res = await request(app)
      .get('/api/pools/99999/balance')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/pools/1/balance');
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/pools/:id/withdrawals ──────────────────────────────────────────

describe('POST /api/pools/:id/withdrawals', () => {
  it('member can request a withdrawal', async () => {
    const alice = await createUser('alice@example.com');
    const created = await createPool(alice.token, { targetAmount: 1000 });
    const poolId = created.body.id;

    const res = await request(app)
      .post(`/api/pools/${poolId}/withdrawals`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amountCents: 500, note: 'Emergency' });

    expect(res.status).toBe(201);
    expect(res.body.amountCents).toBe(500);
    expect(res.body.status).toBe('pending');
  });

  it('returns 403 when the user is not a member', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    const created = await createPool(alice.token);
    const poolId = created.body.id;

    const res = await request(app)
      .post(`/api/pools/${poolId}/withdrawals`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ amountCents: 500 });

    expect(res.status).toBe(403);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/pools/1/withdrawals')
      .send({ amountCents: 100 });
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/pools/:id/withdrawals/:wid/approve ────────────────────────────

describe('PATCH /api/pools/:id/withdrawals/:wid/approve', () => {
  it('organiser can approve a pending withdrawal', async () => {
    const alice = await createUser('alice@example.com');
    const created = await createPool(alice.token, { targetAmount: 1000 });
    const poolId = created.body.id;

    const wRes = await request(app)
      .post(`/api/pools/${poolId}/withdrawals`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amountCents: 200 });

    const res = await request(app)
      .patch(`/api/pools/${poolId}/withdrawals/${wRes.body.id}/approve`)
      .set('Authorization', `Bearer ${alice.token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('returns 403 when a non-organiser tries to approve', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    const created = await createPool(alice.token, { targetAmount: 1000 });
    const poolId = created.body.id;

    // Invite bob so he is a member
    await request(app)
      .post(`/api/pools/${poolId}/invite`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ userId: bob.id });

    const wRes = await request(app)
      .post(`/api/pools/${poolId}/withdrawals`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ amountCents: 200 });

    const res = await request(app)
      .patch(`/api/pools/${poolId}/withdrawals/${wRes.body.id}/approve`)
      .set('Authorization', `Bearer ${bob.token}`);

    expect(res.status).toBe(403);
  });

  it('returns 422 when trying to approve an already-approved withdrawal', async () => {
    const alice = await createUser('alice@example.com');
    const created = await createPool(alice.token, { targetAmount: 1000 });
    const poolId = created.body.id;

    const wRes = await request(app)
      .post(`/api/pools/${poolId}/withdrawals`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amountCents: 200 });
    const wid = wRes.body.id;

    await request(app)
      .patch(`/api/pools/${poolId}/withdrawals/${wid}/approve`)
      .set('Authorization', `Bearer ${alice.token}`);

    const res = await request(app)
      .patch(`/api/pools/${poolId}/withdrawals/${wid}/approve`)
      .set('Authorization', `Bearer ${alice.token}`);

    expect(res.status).toBe(422);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).patch('/api/pools/1/withdrawals/1/approve');
    expect(res.status).toBe(401);
  });
});
