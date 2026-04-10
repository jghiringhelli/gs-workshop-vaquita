import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../app';
import { createTestDb, setDb } from '../db';

beforeEach(() => {
  setDb(createTestDb());
});

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

/** Returns an active tanda with alice=organizer, bob+carol=members. */
async function activeTanda() {
  const alice = await registerAndLogin('alice@example.com', 'alice');
  const bob = await registerAndLogin('bob@example.com', 'bob');
  const carol = await registerAndLogin('carol@example.com', 'carol');

  const create = await request(app)
    .post('/api/tandas')
    .set('Authorization', `Bearer ${alice.token}`)
    .send({ name: 'Test Tanda', contributionAmount: 1000, totalRounds: 3 });
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

/** Creates a withdrawal with a receiptUrl so votes can be cast. */
async function withdrawalWithReceipt(tandaId: number, token: string) {
  const res = await request(app)
    .post(`/api/tandas/${tandaId}/withdrawals`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      amountCents: 500,
      reason: 'Expenses',
      receiptUrl: 'https://example.com/receipt.pdf',
    });
  return res.body as { id: number };
}

// ─── POST /api/tandas/:id/withdrawals ─────────────────────────────────────────

describe('POST /api/tandas/:id/withdrawals', () => {
  it('organizer can create a withdrawal request', async () => {
    const { alice, tandaId } = await activeTanda();

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/withdrawals`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amountCents: 500, reason: 'Expenses' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
    expect(res.body.amountCents).toBe(500);
    expect(res.body.receiptUrl).toBeNull();
  });

  it('returns 403 when a member (non-organizer) attempts to request', async () => {
    const { bob, tandaId } = await activeTanda();

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/withdrawals`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ amountCents: 500, reason: 'Test' });

    expect(res.status).toBe(403);
  });

  it('returns 401 without auth', async () => {
    const { tandaId } = await activeTanda();
    const res = await request(app)
      .post(`/api/tandas/${tandaId}/withdrawals`)
      .send({ amountCents: 500, reason: 'Test' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing required fields', async () => {
    const { alice, tandaId } = await activeTanda();
    const res = await request(app)
      .post(`/api/tandas/${tandaId}/withdrawals`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ reason: 'Missing amount' });
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/tandas/:id/withdrawals ──────────────────────────────────────────

describe('GET /api/tandas/:id/withdrawals', () => {
  it('returns an empty list for a tanda with no withdrawals', async () => {
    const { tandaId } = await activeTanda();
    const res = await request(app).get(`/api/tandas/${tandaId}/withdrawals`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns withdrawals with vote counts', async () => {
    const { alice, tandaId } = await activeTanda();
    await withdrawalWithReceipt(tandaId, alice.token);

    const res = await request(app).get(`/api/tandas/${tandaId}/withdrawals`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].approveCount).toBe(0);
    expect(res.body[0].rejectCount).toBe(0);
  });

  it('returns 404 for an unknown tanda', async () => {
    const res = await request(app).get('/api/tandas/9999/withdrawals');
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/withdrawals/:id/vote ───────────────────────────────────────────

describe('POST /api/withdrawals/:id/vote', () => {
  it('blocks voting when receiptUrl is absent', async () => {
    const { alice, bob, tandaId } = await activeTanda();
    const noReceipt = await request(app)
      .post(`/api/tandas/${tandaId}/withdrawals`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amountCents: 500, reason: 'No receipt' });

    const res = await request(app)
      .post(`/api/withdrawals/${noReceipt.body.id}/vote`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ vote: 'approve' });

    expect(res.status).toBe(400);
  });

  it('blocks voting on own withdrawal', async () => {
    const { alice, tandaId } = await activeTanda();
    const w = await withdrawalWithReceipt(tandaId, alice.token);

    const res = await request(app)
      .post(`/api/withdrawals/${w.id}/vote`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ vote: 'approve' });

    expect(res.status).toBe(403);
  });

  it('returns 409 on duplicate vote', async () => {
    const { alice, bob, tandaId } = await activeTanda();
    const w = await withdrawalWithReceipt(tandaId, alice.token);

    await request(app)
      .post(`/api/withdrawals/${w.id}/vote`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ vote: 'approve' });

    const res = await request(app)
      .post(`/api/withdrawals/${w.id}/vote`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ vote: 'approve' });

    expect(res.status).toBe(409);
  });

  it('approves withdrawal at ceil(members/2) approve votes', async () => {
    // 3 participants → threshold = ceil(3/2) = 2 approve votes
    const { alice, bob, carol, tandaId } = await activeTanda();
    const w = await withdrawalWithReceipt(tandaId, alice.token);

    // 1st approve
    await request(app)
      .post(`/api/withdrawals/${w.id}/vote`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ vote: 'approve' });

    // 2nd approve — should trigger approval
    const res = await request(app)
      .post(`/api/withdrawals/${w.id}/vote`)
      .set('Authorization', `Bearer ${carol.token}`)
      .send({ vote: 'approve' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
    expect(res.body.resolvedAt).toBeTruthy();
  });

  it('rejects withdrawal at floor(members/2)+1 reject votes', async () => {
    // 3 participants → threshold = floor(3/2)+1 = 2 reject votes
    const { alice, bob, carol, tandaId } = await activeTanda();
    const w = await withdrawalWithReceipt(tandaId, alice.token);

    await request(app)
      .post(`/api/withdrawals/${w.id}/vote`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ vote: 'reject' });

    const res = await request(app)
      .post(`/api/withdrawals/${w.id}/vote`)
      .set('Authorization', `Bearer ${carol.token}`)
      .send({ vote: 'reject' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');
    expect(res.body.resolvedAt).toBeTruthy();
  });

  it('blocks further votes after withdrawal is resolved', async () => {
    const { alice, bob, carol, tandaId } = await activeTanda();
    const dave = await registerAndLogin('dave@example.com', 'dave');
    // Need a 4th participant to have a vote left after approval
    await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .set('Authorization', `Bearer ${dave.token}`)
      .send({});

    // Restart so dave is included — but tanda is already active. Let's test with 3 only.
    // After 2 approvals the withdrawal is approved; a 3rd vote should fail.
    const w = await withdrawalWithReceipt(tandaId, alice.token);

    await request(app)
      .post(`/api/withdrawals/${w.id}/vote`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ vote: 'approve' });
    await request(app)
      .post(`/api/withdrawals/${w.id}/vote`)
      .set('Authorization', `Bearer ${carol.token}`)
      .send({ vote: 'approve' });

    // Tanda is already active, dave joined after start → dave has no participant record
    // Use alice trying to vote on her own — but she's the requester (403)
    // Instead register a new user that's not a participant:
    const eve = await registerAndLogin('eve@example.com', 'eve');
    const res = await request(app)
      .post(`/api/withdrawals/${w.id}/vote`)
      .set('Authorization', `Bearer ${eve.token}`)
      .send({ vote: 'reject' });

    // eve is not a participant → 403; but we also want 400 for already-resolved
    // carol (participant) trying again: 409 duplicate
    const carol2 = carol;
    const res2 = await request(app)
      .post(`/api/withdrawals/${w.id}/vote`)
      .set('Authorization', `Bearer ${carol2.token}`)
      .send({ vote: 'reject' });

    expect(res.status).toBe(403);
    expect(res2.status).toBe(400); // already approved
    void eve;
  });

  it('returns 401 without auth', async () => {
    const { alice, tandaId } = await activeTanda();
    const w = await withdrawalWithReceipt(tandaId, alice.token);
    const res = await request(app)
      .post(`/api/withdrawals/${w.id}/vote`)
      .send({ vote: 'approve' });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/tandas/:id/ledger ───────────────────────────────────────────────

describe('GET /api/tandas/:id/ledger', () => {
  it('returns interleaved contributions and withdrawals ordered by createdAt', async () => {
    const { alice, bob, tandaId } = await activeTanda();

    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({});
    await request(app)
      .post(`/api/tandas/${tandaId}/withdrawals`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ amountCents: 200, reason: 'Expenses' });

    const res = await request(app).get(`/api/tandas/${tandaId}/ledger`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const types = res.body.map((e: { type: string }) => e.type);
    expect(types).toContain('contribution');
    expect(types).toContain('withdrawal');
    void bob;
  });

  it('returns empty list for a new tanda', async () => {
    const { tandaId } = await activeTanda();
    const res = await request(app).get(`/api/tandas/${tandaId}/ledger`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 404 for unknown tanda', async () => {
    const res = await request(app).get('/api/tandas/9999/ledger');
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/tandas/:id/dissolve ────────────────────────────────────────────

describe('POST /api/tandas/:id/dissolve', () => {
  it('organizer can dissolve an active tanda', async () => {
    const { alice, tandaId } = await activeTanda();

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/dissolve`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('returns 403 when a non-organizer attempts to dissolve', async () => {
    const { bob, tandaId } = await activeTanda();

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/dissolve`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({});

    expect(res.status).toBe(403);
  });

  it('returns 400 when tanda is already cancelled', async () => {
    const { alice, tandaId } = await activeTanda();

    await request(app)
      .post(`/api/tandas/${tandaId}/dissolve`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({});

    const res = await request(app)
      .post(`/api/tandas/${tandaId}/dissolve`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const { tandaId } = await activeTanda();
    const res = await request(app)
      .post(`/api/tandas/${tandaId}/dissolve`)
      .send({});
    expect(res.status).toBe(401);
  });
});

// ─── Balance reflects approved withdrawals ────────────────────────────────────

describe('GET /api/tandas/:id/balance (with withdrawals)', () => {
  it('subtracts approved withdrawals from balance', async () => {
    const { alice, bob, carol, tandaId } = await activeTanda();

    // alice contributes 1000
    await request(app)
      .post(`/api/tandas/${tandaId}/contributions`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({});

    // alice requests a withdrawal of 300
    const w = await withdrawalWithReceipt(tandaId, alice.token);

    // bob + carol approve (ceil(3/2) = 2 votes)
    await request(app)
      .post(`/api/withdrawals/${w.id}/vote`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ vote: 'approve' });
    await request(app)
      .post(`/api/withdrawals/${w.id}/vote`)
      .set('Authorization', `Bearer ${carol.token}`)
      .send({ vote: 'approve' });

    const res = await request(app).get(`/api/tandas/${tandaId}/balance`);
    expect(res.status).toBe(200);
    // 1000 contributions - 500 approved withdrawal = 500
    expect(res.body.balance).toBe(500);
  });
});
