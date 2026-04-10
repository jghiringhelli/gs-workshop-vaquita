import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestCtx, createUserWithToken, bearer, type TestCtx } from './helpers';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Stand up a tanda with `count` participants (organizer + extras) and return it started. */
async function buildStartedTanda(
  app: TestCtx['app'],
  count = 3,
): Promise<{ tandaId: string; organizer: { userId: string; token: string } }> {
  const organizer = await createUserWithToken(app, 'org@t.com', 'Organizer');

  const createRes = await request(app)
    .post('/api/tandas')
    .set(bearer(organizer.token))
    .send({ name: 'Test Tanda', contributionAmount: 100 });
  const tandaId = createRes.body.id as string;

  for (let i = 1; i < count; i++) {
    const member = await createUserWithToken(app, `m${i}@t.com`, `Member${i}`);
    await request(app).post(`/api/tandas/${tandaId}/join`).set(bearer(member.token));
  }

  await request(app).post(`/api/tandas/${tandaId}/start`).set(bearer(organizer.token));

  return { tandaId, organizer };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('/api/tandas', () => {
  let ctx: TestCtx;

  beforeEach(() => {
    ctx = createTestCtx();
  });

  // ── POST /api/tandas ───────────────────────────────────────────────────────

  describe('POST /api/tandas', () => {
    it('201 — organizer creates a tanda', async () => {
      const { token } = await createUserWithToken(ctx.app);

      const res = await request(ctx.app)
        .post('/api/tandas')
        .set(bearer(token))
        .send({ name: 'Mi Tanda', contributionAmount: 500 });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: 'Mi Tanda', contributionAmount: 500, status: 'forming' });
    });

    it('401 — no token', async () => {
      const res = await request(ctx.app)
        .post('/api/tandas')
        .send({ name: 'Mi Tanda', contributionAmount: 500 });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('400 — missing contributionAmount', async () => {
      const { token } = await createUserWithToken(ctx.app);
      const res = await request(ctx.app)
        .post('/api/tandas')
        .set(bearer(token))
        .send({ name: 'Oops' });
      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/tandas ────────────────────────────────────────────────────────

  describe('GET /api/tandas', () => {
    it('200 — returns all tandas', async () => {
      const { token } = await createUserWithToken(ctx.app);
      await request(ctx.app).post('/api/tandas').set(bearer(token)).send({ name: 'T1', contributionAmount: 10 });

      const res = await request(ctx.app).get('/api/tandas').set(bearer(token));
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('200 — filters by ?userId', async () => {
      const u1 = await createUserWithToken(ctx.app, 'u1@t.com', 'U1');
      const u2 = await createUserWithToken(ctx.app, 'u2@t.com', 'U2');
      await request(ctx.app).post('/api/tandas').set(bearer(u1.token)).send({ name: 'U1 Tanda', contributionAmount: 10 });
      await request(ctx.app).post('/api/tandas').set(bearer(u2.token)).send({ name: 'U2 Tanda', contributionAmount: 10 });

      const res = await request(ctx.app).get(`/api/tandas?userId=${u1.userId}`).set(bearer(u1.token));
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('U1 Tanda');
    });
  });

  // ── GET /api/tandas/:id ────────────────────────────────────────────────────

  describe('GET /api/tandas/:id', () => {
    it('200 — returns tanda details', async () => {
      const { token } = await createUserWithToken(ctx.app);
      const created = await request(ctx.app)
        .post('/api/tandas')
        .set(bearer(token))
        .send({ name: 'Detail', contributionAmount: 200 });

      const res = await request(ctx.app).get(`/api/tandas/${created.body.id}`).set(bearer(token));
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Detail');
    });

    it('404 — unknown tanda', async () => {
      const { token } = await createUserWithToken(ctx.app);
      const res = await request(ctx.app)
        .get('/api/tandas/00000000-0000-0000-0000-000000000000')
        .set(bearer(token));
      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/tandas/:id/join ──────────────────────────────────────────────

  describe('POST /api/tandas/:id/join', () => {
    it('201 — member joins a forming tanda', async () => {
      const organizer = await createUserWithToken(ctx.app, 'org@j.com', 'Org');
      const member = await createUserWithToken(ctx.app, 'mem@j.com', 'Mem');

      const tanda = await request(ctx.app)
        .post('/api/tandas')
        .set(bearer(organizer.token))
        .send({ name: 'Join Tanda', contributionAmount: 100 });

      const res = await request(ctx.app)
        .post(`/api/tandas/${tanda.body.id}/join`)
        .set(bearer(member.token));

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('member');
    });

    it('409 — cannot join twice', async () => {
      const organizer = await createUserWithToken(ctx.app, 'org2@j.com', 'Org2');
      const member = await createUserWithToken(ctx.app, 'mem2@j.com', 'Mem2');

      const tanda = await request(ctx.app)
        .post('/api/tandas')
        .set(bearer(organizer.token))
        .send({ name: 'DupJoin', contributionAmount: 100 });

      await request(ctx.app).post(`/api/tandas/${tanda.body.id}/join`).set(bearer(member.token));
      const res = await request(ctx.app)
        .post(`/api/tandas/${tanda.body.id}/join`)
        .set(bearer(member.token));

      expect(res.status).toBe(409);
    });

    it('400 — cannot join active tanda', async () => {
      const { tandaId, organizer } = await buildStartedTanda(ctx.app);
      const lateUser = await createUserWithToken(ctx.app, 'late@j.com', 'Late');

      const res = await request(ctx.app)
        .post(`/api/tandas/${tandaId}/join`)
        .set(bearer(lateUser.token));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');

      // suppress lint warning: organizer used only for setup
      void organizer;
    });
  });

  // ── GET /api/tandas/:id/participants ──────────────────────────────────────

  describe('GET /api/tandas/:id/participants', () => {
    it('200 — returns participant list', async () => {
      const { tandaId, organizer } = await buildStartedTanda(ctx.app, 3);

      const res = await request(ctx.app)
        .get(`/api/tandas/${tandaId}/participants`)
        .set(bearer(organizer.token));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
    });

    it('404 — unknown tanda', async () => {
      const { token } = await createUserWithToken(ctx.app);
      const res = await request(ctx.app)
        .get('/api/tandas/00000000-0000-0000-0000-000000000000/participants')
        .set(bearer(token));
      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/tandas/:id/start ────────────────────────────────────────────

  describe('POST /api/tandas/:id/start', () => {
    it('200 — organizer starts with enough participants', async () => {
      const { tandaId, organizer } = await buildStartedTanda(ctx.app, 3);

      const res = await request(ctx.app)
        .get(`/api/tandas/${tandaId}`)
        .set(bearer(organizer.token));

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('active');
      expect(res.body.currentRound).toBe(1);
      expect(res.body.totalRounds).toBe(3);
    });

    it('400 — not enough participants', async () => {
      const organizer = await createUserWithToken(ctx.app, 'solo@s.com', 'Solo');
      const tanda = await request(ctx.app)
        .post('/api/tandas')
        .set(bearer(organizer.token))
        .send({ name: 'Solo Tanda', contributionAmount: 100 });

      // Only 1 participant (organizer) — need at least 3
      const res = await request(ctx.app)
        .post(`/api/tandas/${tanda.body.id}/start`)
        .set(bearer(organizer.token));

      expect(res.status).toBe(400);
    });

    it('403 — non-organizer cannot start', async () => {
      const organizer = await createUserWithToken(ctx.app, 'org3@s.com', 'Org3');
      const member = await createUserWithToken(ctx.app, 'mem3@s.com', 'Mem3');

      const tanda = await request(ctx.app)
        .post('/api/tandas')
        .set(bearer(organizer.token))
        .send({ name: 'T', contributionAmount: 100 });

      await request(ctx.app).post(`/api/tandas/${tanda.body.id}/join`).set(bearer(member.token));

      const res = await request(ctx.app)
        .post(`/api/tandas/${tanda.body.id}/start`)
        .set(bearer(member.token));

      expect(res.status).toBe(403);
    });
  });

  // ── POST /api/tandas/:id/contributions ───────────────────────────────────

  describe('POST /api/tandas/:id/contributions', () => {
    it('201 — participant records a contribution', async () => {
      const { tandaId, organizer } = await buildStartedTanda(ctx.app, 3);

      const res = await request(ctx.app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .set(bearer(organizer.token));

      expect(res.status).toBe(201);
      expect(['paid', 'late']).toContain(res.body.status);
    });

    it('409 — cannot contribute twice in same round', async () => {
      const { tandaId, organizer } = await buildStartedTanda(ctx.app, 3);
      await request(ctx.app).post(`/api/tandas/${tandaId}/contributions`).set(bearer(organizer.token));

      const res = await request(ctx.app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .set(bearer(organizer.token));

      expect(res.status).toBe(409);
    });

    it('403 — non-participant cannot contribute', async () => {
      const { tandaId } = await buildStartedTanda(ctx.app, 3);
      const outsider = await createUserWithToken(ctx.app, 'out@c.com', 'Outsider');

      const res = await request(ctx.app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .set(bearer(outsider.token));

      expect(res.status).toBe(403);
    });

    it('400 — cannot contribute to a forming tanda', async () => {
      const organizer = await createUserWithToken(ctx.app, 'orgF@c.com', 'OrgF');
      const tanda = await request(ctx.app)
        .post('/api/tandas')
        .set(bearer(organizer.token))
        .send({ name: 'Forming', contributionAmount: 50 });

      const res = await request(ctx.app)
        .post(`/api/tandas/${tanda.body.id}/contributions`)
        .set(bearer(organizer.token));

      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/tandas/:id/rounds/:round ─────────────────────────────────────

  describe('GET /api/tandas/:id/rounds/:round', () => {
    it('200 — returns round summary', async () => {
      const { tandaId, organizer } = await buildStartedTanda(ctx.app, 3);

      const res = await request(ctx.app)
        .get(`/api/tandas/${tandaId}/rounds/1`)
        .set(bearer(organizer.token));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('tanda');
      expect(res.body).toHaveProperty('contributions');
      expect(res.body).toHaveProperty('totals');
      expect(res.body.round).toBe(1);
    });

    it('404 — tanda not found', async () => {
      const { token } = await createUserWithToken(ctx.app);
      const res = await request(ctx.app)
        .get('/api/tandas/00000000-0000-0000-0000-000000000000/rounds/1')
        .set(bearer(token));
      expect(res.status).toBe(404);
    });

    it('400 — invalid round number', async () => {
      const { tandaId, organizer } = await buildStartedTanda(ctx.app, 3);
      const res = await request(ctx.app)
        .get(`/api/tandas/${tandaId}/rounds/abc`)
        .set(bearer(organizer.token));
      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/tandas/:id/advance ──────────────────────────────────────────

  describe('POST /api/tandas/:id/advance', () => {
    it('200 — organizer advances the round', async () => {
      const { tandaId, organizer } = await buildStartedTanda(ctx.app, 3);

      const res = await request(ctx.app)
        .post(`/api/tandas/${tandaId}/advance`)
        .set(bearer(organizer.token));

      expect(res.status).toBe(200);
      expect(res.body.currentRound).toBe(2);
    });

    it('200 — tanda completes after last round', async () => {
      const { tandaId, organizer } = await buildStartedTanda(ctx.app, 3);

      // Advance through all 3 rounds
      await request(ctx.app).post(`/api/tandas/${tandaId}/advance`).set(bearer(organizer.token));
      await request(ctx.app).post(`/api/tandas/${tandaId}/advance`).set(bearer(organizer.token));
      const res = await request(ctx.app)
        .post(`/api/tandas/${tandaId}/advance`)
        .set(bearer(organizer.token));

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
    });

    it('403 — member cannot advance', async () => {
      const { tandaId } = await buildStartedTanda(ctx.app, 3);
      const outsider = await createUserWithToken(ctx.app, 'adv_out@t.com', 'AdvOut');

      const res = await request(ctx.app)
        .post(`/api/tandas/${tandaId}/advance`)
        .set(bearer(outsider.token));

      expect(res.status).toBe(403);
    });

    it('400 — cannot advance a forming tanda', async () => {
      const organizer = await createUserWithToken(ctx.app, 'orgAdv@t.com', 'OrgAdv');
      const tanda = await request(ctx.app)
        .post('/api/tandas')
        .set(bearer(organizer.token))
        .send({ name: 'Adv', contributionAmount: 10 });

      const res = await request(ctx.app)
        .post(`/api/tandas/${tanda.body.id}/advance`)
        .set(bearer(organizer.token));

      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/tandas/:id/cancel ───────────────────────────────────────────

  describe('POST /api/tandas/:id/cancel', () => {
    it('200 — organizer cancels a forming tanda', async () => {
      const organizer = await createUserWithToken(ctx.app, 'orgC@t.com', 'OrgC');
      const tanda = await request(ctx.app)
        .post('/api/tandas')
        .set(bearer(organizer.token))
        .send({ name: 'Cancel Me', contributionAmount: 10 });

      const res = await request(ctx.app)
        .post(`/api/tandas/${tanda.body.id}/cancel`)
        .set(bearer(organizer.token));

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
    });

    it('403 — non-organizer cannot cancel', async () => {
      const organizer = await createUserWithToken(ctx.app, 'orgC2@t.com', 'OrgC2');
      const member = await createUserWithToken(ctx.app, 'memC@t.com', 'MemC');

      const tanda = await request(ctx.app)
        .post('/api/tandas')
        .set(bearer(organizer.token))
        .send({ name: 'T', contributionAmount: 10 });

      await request(ctx.app).post(`/api/tandas/${tanda.body.id}/join`).set(bearer(member.token));

      const res = await request(ctx.app)
        .post(`/api/tandas/${tanda.body.id}/cancel`)
        .set(bearer(member.token));

      expect(res.status).toBe(403);
    });

    it('400 — cannot cancel completed tanda', async () => {
      const { tandaId, organizer } = await buildStartedTanda(ctx.app, 3);

      // Advance through all rounds to complete
      for (let i = 0; i < 3; i++) {
        await request(ctx.app).post(`/api/tandas/${tandaId}/advance`).set(bearer(organizer.token));
      }

      const res = await request(ctx.app)
        .post(`/api/tandas/${tandaId}/cancel`)
        .set(bearer(organizer.token));

      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/tandas/:id/participants/:pid/history ─────────────────────────

  describe('GET /api/tandas/:id/participants/:pid/history', () => {
    it('200 — returns contribution history for a participant', async () => {
      const { tandaId, organizer } = await buildStartedTanda(ctx.app, 3);

      // Record a contribution
      await request(ctx.app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .set(bearer(organizer.token));

      // Get the organizer's participant record
      const participants = await request(ctx.app)
        .get(`/api/tandas/${tandaId}/participants`)
        .set(bearer(organizer.token));

      const orgParticipant = participants.body.find(
        (p: { userId: string }) => p.userId === organizer.userId,
      );

      const res = await request(ctx.app)
        .get(`/api/tandas/${tandaId}/participants/${orgParticipant.id}/history`)
        .set(bearer(organizer.token));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('participant');
      expect(res.body).toHaveProperty('contributions');
      expect(Array.isArray(res.body.contributions)).toBe(true);
    });

    it('404 — unknown participant', async () => {
      const { tandaId, organizer } = await buildStartedTanda(ctx.app, 3);
      const res = await request(ctx.app)
        .get(`/api/tandas/${tandaId}/participants/00000000-0000-0000-0000-000000000000/history`)
        .set(bearer(organizer.token));
      expect(res.status).toBe(404);
    });
  });
});
