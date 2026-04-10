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

async function createPool(token: string, overrides: Record<string, unknown> = {}) {
  return request(app)
    .post('/api/pools')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Pool', targetAmount: 100, currency: 'MXN', ...overrides });
}

async function inviteUser(token: string, poolId: number, userId: number) {
  return request(app)
    .post(`/api/pools/${poolId}/invite`)
    .set('Authorization', `Bearer ${token}`)
    .send({ userId });
}

async function createWithdrawal(token: string, poolId: number, overrides: Record<string, unknown> = {}) {
  return request(app)
    .post(`/api/pools/${poolId}/withdrawals`)
    .set('Authorization', `Bearer ${token}`)
    .send({ amountCents: 1000, receiptUrl: 'https://example.com/receipt.pdf', ...overrides });
}

// ─── POST /api/withdrawals/:id/vote ──────────────────────────────────────────

describe('POST /api/withdrawals/:id/vote', () => {
  it('a member can cast an approve vote', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    const pool = await createPool(alice.token);
    const poolId = pool.body.id;
    await inviteUser(alice.token, poolId, bob.id);

    const wRes = await createWithdrawal(alice.token, poolId);
    const wid = wRes.body.id;

    const res = await request(app)
      .post(`/api/withdrawals/${wid}/vote`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ vote: 'approve' });

    expect(res.status).toBe(201);
    // 2 members: ceil(2/2)=1 approve needed → auto-approved
    expect(res.body.status).toBe('approved');
    expect(res.body.resolvedAt).not.toBeNull();
  });

  it('a member can cast a reject vote', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    const carol = await createUser('carol@example.com');
    const pool = await createPool(alice.token);
    const poolId = pool.body.id;
    await inviteUser(alice.token, poolId, bob.id);
    await inviteUser(alice.token, poolId, carol.id);

    const wRes = await createWithdrawal(alice.token, poolId);
    const wid = wRes.body.id;

    // N=3: floor(3/2)+1=2 rejects needed
    await request(app)
      .post(`/api/withdrawals/${wid}/vote`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ vote: 'reject' });

    const res = await request(app)
      .post(`/api/withdrawals/${wid}/vote`)
      .set('Authorization', `Bearer ${carol.token}`)
      .send({ vote: 'reject' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('rejected');
    expect(res.body.resolvedAt).not.toBeNull();
  });

  it('auto-approves when approve threshold is reached', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    const carol = await createUser('carol@example.com');
    const pool = await createPool(alice.token);
    const poolId = pool.body.id;
    await inviteUser(alice.token, poolId, bob.id);
    await inviteUser(alice.token, poolId, carol.id);

    const wRes = await createWithdrawal(alice.token, poolId);
    const wid = wRes.body.id;

    // N=3: ceil(3/2)=2 approves needed
    await request(app)
      .post(`/api/withdrawals/${wid}/vote`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ vote: 'approve' });

    const res = await request(app)
      .post(`/api/withdrawals/${wid}/vote`)
      .set('Authorization', `Bearer ${carol.token}`)
      .send({ vote: 'approve' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('approved');
  });

  it('returns 403 when the requester tries to vote on their own withdrawal', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    const pool = await createPool(alice.token);
    const poolId = pool.body.id;
    await inviteUser(alice.token, poolId, bob.id);

    const wRes = await createWithdrawal(alice.token, poolId);

    const res = await request(app)
      .post(`/api/withdrawals/${wRes.body.id}/vote`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ vote: 'approve' });

    expect(res.status).toBe(403);
  });

  it('returns 422 when voting on a resolved withdrawal', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    const pool = await createPool(alice.token);
    const poolId = pool.body.id;
    await inviteUser(alice.token, poolId, bob.id);

    const wRes = await createWithdrawal(alice.token, poolId);
    const wid = wRes.body.id;

    // Bob's vote auto-approves (N=2, ceil(2/2)=1)
    await request(app)
      .post(`/api/withdrawals/${wid}/vote`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ vote: 'approve' });

    // Bob tries to vote again on an already-approved withdrawal
    const res = await request(app)
      .post(`/api/withdrawals/${wid}/vote`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ vote: 'reject' });

    expect(res.status).toBe(422);
  });

  it('returns 409 when the same member votes twice', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    const carol = await createUser('carol@example.com');
    const pool = await createPool(alice.token);
    const poolId = pool.body.id;
    await inviteUser(alice.token, poolId, bob.id);
    await inviteUser(alice.token, poolId, carol.id);

    // N=3: needs 2 approves; 1 reject from bob won't resolve
    const wRes = await createWithdrawal(alice.token, poolId);
    const wid = wRes.body.id;

    await request(app)
      .post(`/api/withdrawals/${wid}/vote`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ vote: 'reject' });

    // Bob tries to vote again (duplicate)
    const res = await request(app)
      .post(`/api/withdrawals/${wid}/vote`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ vote: 'approve' });

    expect(res.status).toBe(409);
  });

  it('returns 422 when receiptUrl is missing', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    const pool = await createPool(alice.token);
    const poolId = pool.body.id;
    await inviteUser(alice.token, poolId, bob.id);

    // Create withdrawal without receiptUrl
    const wRes = await request(app)
      .post(`/api/pools/${poolId}/withdrawals`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amountCents: 500 });
    expect(wRes.body.receiptUrl).toBeNull();

    const res = await request(app)
      .post(`/api/withdrawals/${wRes.body.id}/vote`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ vote: 'approve' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('BUSINESS_RULE_VIOLATION');
  });

  it('returns 403 when user is not a member of the pool', async () => {
    const alice = await createUser('alice@example.com');
    const bob = await createUser('bob@example.com');
    const eve = await createUser('eve@example.com');
    const pool = await createPool(alice.token);
    const poolId = pool.body.id;
    await inviteUser(alice.token, poolId, bob.id);

    const wRes = await createWithdrawal(alice.token, poolId);

    const res = await request(app)
      .post(`/api/withdrawals/${wRes.body.id}/vote`)
      .set('Authorization', `Bearer ${eve.token}`)
      .send({ vote: 'approve' });

    expect(res.status).toBe(403);
  });

  it('returns 404 for a non-existent withdrawal', async () => {
    const alice = await createUser('alice@example.com');
    const res = await request(app)
      .post('/api/withdrawals/99999/vote')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ vote: 'approve' });

    expect(res.status).toBe(404);
  });

  it('returns 400 for an invalid vote value', async () => {
    const alice = await createUser('alice@example.com');
    const res = await request(app)
      .post('/api/withdrawals/1/vote')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ vote: 'maybe' });

    expect(res.status).toBe(400);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/withdrawals/1/vote')
      .send({ vote: 'approve' });
    expect(res.status).toBe(401);
  });
});
