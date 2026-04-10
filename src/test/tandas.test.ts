import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import { clearAllTables } from '../db';
import { createUserAndToken, seedTanda, joinTanda, startTanda } from './helpers';

beforeEach(() => {
  clearAllTables();
  vi.useRealTimers();
});

// ─── POST /api/tandas ────────────────────────────────────────────────────────

describe('POST /api/tandas', () => {
  it('creates a tanda and auto-joins the organizer', async () => {
    const { token, user } = await createUserAndToken();
    const res = await request(app)
      .post('/api/tandas')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mi Tanda', contributionAmount: 100 });

    expect(res.status).toBe(201);
    expect(res.body.tanda).toMatchObject({
      name: 'Mi Tanda',
      contributionAmount: 100,
      status: 'forming',
      organizerId: user.id,
      currentRound: 1,
      totalRounds: 0,
    });
    expect(res.body.participant).toMatchObject({
      userId: user.id,
      role: 'organizer',
    });
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/tandas')
      .send({ name: 'X', contributionAmount: 50 });
    expect(res.status).toBe(401);
  });

  it('returns 422 when contributionAmount is not positive', async () => {
    const { token } = await createUserAndToken();
    const res = await request(app)
      .post('/api/tandas')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad', contributionAmount: -10 });
    expect(res.status).toBe(422);
  });
});

// ─── GET /api/tandas ─────────────────────────────────────────────────────────

describe('GET /api/tandas', () => {
  it("lists the current user's tandas", async () => {
    const { token } = await createUserAndToken();
    await seedTanda(token);
    const res = await request(app)
      .get('/api/tandas')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.tandas.length).toBe(1);
  });

  it('returns 403 when requesting another user\'s tandas', async () => {
    const { token } = await createUserAndToken();
    const { user: other } = await createUserAndToken();

    const res = await request(app)
      .get(`/api/tandas?userId=${other.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

// ─── POST /api/tandas/:id/join ────────────────────────────────────────────────

describe('POST /api/tandas/:id/join', () => {
  it('allows a new user to join a forming tanda', async () => {
    const { token: orgToken } = await createUserAndToken();
    const { token: memberToken, user: member } = await createUserAndToken();
    const tanda = await seedTanda(orgToken);

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/join`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(201);
    expect(res.body.participant).toMatchObject({ userId: member.id, role: 'member' });
  });

  it('prevents joining twice (duplicate member)', async () => {
    const { token: orgToken } = await createUserAndToken();
    const { token: memberToken } = await createUserAndToken();
    const tanda = await seedTanda(orgToken);

    await joinTanda(tanda.id, memberToken);
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/join`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects joining when tanda is not forming', async () => {
    const { token: orgToken } = await createUserAndToken();
    const { token: m1 } = await createUserAndToken();
    const { token: m2 } = await createUserAndToken();
    const tanda = await seedTanda(orgToken);

    await joinTanda(tanda.id, m1);
    await joinTanda(tanda.id, m2);
    await startTanda(tanda.id, orgToken);

    const { token: lateUser } = await createUserAndToken();
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/join`)
      .set('Authorization', `Bearer ${lateUser}`);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
  });
});

// ─── POST /api/tandas/:id/start ───────────────────────────────────────────────

describe('POST /api/tandas/:id/start', () => {
  it('starts a tanda with enough participants and assigns positions 1..N', async () => {
    const { token: orgToken } = await createUserAndToken();
    const { token: m1 } = await createUserAndToken();
    const { token: m2 } = await createUserAndToken();
    const tanda = await seedTanda(orgToken);

    await joinTanda(tanda.id, m1);
    await joinTanda(tanda.id, m2);

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    expect(res.body.tanda.status).toBe('active');
    expect(res.body.tanda.totalRounds).toBe(3);
    expect(res.body.tanda.currentRound).toBe(1);

    // Verify unique positions 1..3
    const pRes = await request(app)
      .get(`/api/tandas/${tanda.id}/participants`)
      .set('Authorization', `Bearer ${orgToken}`);

    const positions = pRes.body.participants.map(
      (p: { rotationPosition: number }) => p.rotationPosition,
    );
    expect(positions.sort((a: number, b: number) => a - b)).toEqual([1, 2, 3]);
  });

  it('returns 403 when a non-organizer tries to start', async () => {
    const { token: orgToken } = await createUserAndToken();
    const { token: memberToken } = await createUserAndToken();
    const { token: m2 } = await createUserAndToken();
    const tanda = await seedTanda(orgToken);

    await joinTanda(tanda.id, memberToken);
    await joinTanda(tanda.id, m2);

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 422 when fewer than MIN_PARTICIPANTS_TO_START have joined', async () => {
    const { token: orgToken } = await createUserAndToken();
    const tanda = await seedTanda(orgToken); // only organizer

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/start`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
  });
});

// ─── POST /api/tandas/:id/contributions ──────────────────────────────────────

describe('POST /api/tandas/:id/contributions', () => {
  async function setupActiveTanda() {
    const { token: orgToken, user: organizer } = await createUserAndToken();
    const { token: m1Token, user: m1 } = await createUserAndToken();
    const { token: m2Token, user: m2 } = await createUserAndToken();
    const tanda = await seedTanda(orgToken);
    await joinTanda(tanda.id, m1Token);
    await joinTanda(tanda.id, m2Token);
    await startTanda(tanda.id, orgToken);
    return { tanda, orgToken, m1Token, m2Token, organizer, m1, m2 };
  }

  it('records a paid contribution within the window', async () => {
    const { tanda, orgToken } = await setupActiveTanda();

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(201);
    expect(res.body.contribution.status).toBe('paid');
    expect(res.body.contribution.amount).toBe(100);
  });

  it('records a late contribution past the window', async () => {
    const { tanda, m1Token } = await setupActiveTanda();

    // Advance time past the 72-hour window
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 73 * 60 * 60 * 1000);

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .set('Authorization', `Bearer ${m1Token}`);

    vi.useRealTimers();

    expect(res.status).toBe(201);
    expect(res.body.contribution.status).toBe('late');
    // 100 * 1.05 = 105
    expect(res.body.contribution.amount).toBeCloseTo(105);
  });

  it('returns 409 when contributing twice in the same round', async () => {
    const { tanda, orgToken } = await setupActiveTanda();

    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .set('Authorization', `Bearer ${orgToken}`);

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns 422 when tanda is not active', async () => {
    const { token: orgToken } = await createUserAndToken();
    const tanda = await seedTanda(orgToken);

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(422);
  });

  it('returns 403 when non-participant tries to contribute', async () => {
    const { tanda } = await setupActiveTanda();
    const { token: outsiderToken } = await createUserAndToken();

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
  });
});

// ─── POST /api/tandas/:id/advance ─────────────────────────────────────────────

describe('POST /api/tandas/:id/advance', () => {
  async function setupActiveTanda() {
    const { token: orgToken } = await createUserAndToken();
    const { token: m1Token } = await createUserAndToken();
    const { token: m2Token } = await createUserAndToken();
    const tanda = await seedTanda(orgToken);
    await joinTanda(tanda.id, m1Token);
    await joinTanda(tanda.id, m2Token);
    await startTanda(tanda.id, orgToken);
    return { tanda, orgToken, m1Token, m2Token };
  }

  it('marks missing contributions as missed when advancing', async () => {
    const { tanda, orgToken } = await setupActiveTanda();

    // Advance without anyone contributing
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    expect(res.body.tanda.currentRound).toBe(2);

    // Check round 1 summary — all 3 should be missed
    const summaryRes = await request(app)
      .get(`/api/tandas/${tanda.id}/rounds/1`)
      .set('Authorization', `Bearer ${orgToken}`);

    const missed = summaryRes.body.participantStatuses.filter(
      (s: { contribution: { status: string } | null }) => s.contribution?.status === 'missed',
    );
    expect(missed.length).toBe(3);
  });

  it('completes the tanda after the last round', async () => {
    const { tanda, orgToken } = await setupActiveTanda();

    // Advance through all 3 rounds
    await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .set('Authorization', `Bearer ${orgToken}`);
    await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .set('Authorization', `Bearer ${orgToken}`);
    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    expect(res.body.tanda.status).toBe('completed');
  });

  it('returns 403 when a non-organizer tries to advance', async () => {
    const { tanda, m1Token } = await setupActiveTanda();

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/advance`)
      .set('Authorization', `Bearer ${m1Token}`);

    expect(res.status).toBe(403);
  });
});

// ─── POST /api/tandas/:id/cancel ─────────────────────────────────────────────

describe('POST /api/tandas/:id/cancel', () => {
  it('organizer can cancel a forming tanda', async () => {
    const { token: orgToken } = await createUserAndToken();
    const tanda = await seedTanda(orgToken);

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/cancel`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    expect(res.body.tanda.status).toBe('cancelled');
  });

  it('returns 403 when non-organizer tries to cancel', async () => {
    const { token: orgToken } = await createUserAndToken();
    const { token: memberToken } = await createUserAndToken();
    const tanda = await seedTanda(orgToken);
    await joinTanda(tanda.id, memberToken);

    const res = await request(app)
      .post(`/api/tandas/${tanda.id}/cancel`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
  });
});

// ─── GET /api/tandas/:id/rounds/:round ───────────────────────────────────────

describe('GET /api/tandas/:id/rounds/:round', () => {
  it('returns round summary with receiver and participant statuses', async () => {
    const { token: orgToken } = await createUserAndToken();
    const { token: m1Token } = await createUserAndToken();
    const { token: m2Token } = await createUserAndToken();
    const tanda = await seedTanda(orgToken);
    await joinTanda(tanda.id, m1Token);
    await joinTanda(tanda.id, m2Token);
    await startTanda(tanda.id, orgToken);

    // Organizer contributes
    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .set('Authorization', `Bearer ${orgToken}`);

    const res = await request(app)
      .get(`/api/tandas/${tanda.id}/rounds/1`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    expect(res.body.round).toBe(1);
    expect(res.body.receiver).not.toBeNull();
    expect(Array.isArray(res.body.participantStatuses)).toBe(true);
    expect(res.body.participantStatuses.length).toBe(3);
    expect(typeof res.body.totalCollected).toBe('number');
    expect(typeof res.body.missingCount).toBe('number');
    expect(typeof res.body.isPastWindow).toBe('boolean');
  });
});

// ─── GET /api/tandas/:id/participants/:pid/history ────────────────────────────

describe('GET /api/tandas/:id/participants/:pid/history', () => {
  it("organizer can view any participant's contribution history", async () => {
    const { token: orgToken } = await createUserAndToken();
    const { token: m1Token } = await createUserAndToken();
    const { token: m2Token } = await createUserAndToken();
    const tanda = await seedTanda(orgToken);
    const p1 = await joinTanda(tanda.id, m1Token);
    await joinTanda(tanda.id, m2Token);
    await startTanda(tanda.id, orgToken);

    await request(app)
      .post(`/api/tandas/${tanda.id}/contributions`)
      .set('Authorization', `Bearer ${m1Token}`);

    const res = await request(app)
      .get(`/api/tandas/${tanda.id}/participants/${p1.id}/history`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.contributions)).toBe(true);
    expect(res.body.contributions.length).toBe(1);
  });

  it("member cannot view another member's history", async () => {
    const { token: orgToken } = await createUserAndToken();
    const { token: m1Token } = await createUserAndToken();
    const { token: m2Token } = await createUserAndToken();
    const tanda = await seedTanda(orgToken);
    const p1 = await joinTanda(tanda.id, m1Token);
    await joinTanda(tanda.id, m2Token);
    await startTanda(tanda.id, orgToken);

    const res = await request(app)
      .get(`/api/tandas/${tanda.id}/participants/${p1.id}/history`)
      .set('Authorization', `Bearer ${m2Token}`);

    expect(res.status).toBe(403);
  });
});
