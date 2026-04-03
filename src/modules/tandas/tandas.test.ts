import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { closeDatabase } from '../../shared/database';

type App = ReturnType<typeof createApp>;

/** Register a user and return their token + id. */
const registerUser = async (app: App, email: string, name: string) => {
  const res = await request(app).post('/api/users').send({ email, name });
  return { id: res.body.id as string, token: res.body.token as string };
};

/** Create a tanda and return the tanda body. */
const createTanda = async (app: App, token: string, overrides: Record<string, unknown> = {}) => {
  const res = await request(app)
    .post('/api/tandas')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Tanda', contributionAmount: 1000, totalRounds: 3, ...overrides });
  return res;
};

describe('Tandas API', () => {
  let app: App;

  beforeEach(() => {
    closeDatabase();
    app = createApp();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('POST /api/tandas', () => {
    it('creates a tanda and auto-joins the organizer (201)', async () => {
      const { token } = await registerUser(app, 'org@example.com', 'Organizer');
      const res = await createTanda(app, token);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Test Tanda');
      expect(res.body.status).toBe('forming');
      expect(res.body.contribution_amount).toBe(1000);
    });

    it('returns 401 without a token', async () => {
      const res = await request(app).post('/api/tandas').send({ name: 'X', contributionAmount: 100, totalRounds: 3 });
      expect(res.status).toBe(401);
    });

    it('returns 422 for missing contributionAmount', async () => {
      const { token } = await registerUser(app, 'org2@example.com', 'Org2');
      const res = await request(app)
        .post('/api/tandas')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'X', totalRounds: 3 });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/tandas', () => {
    it('lists tandas for a user', async () => {
      const { id, token } = await registerUser(app, 'u@example.com', 'U');
      await createTanda(app, token);

      const res = await request(app).get(`/api/tandas?userId=${id}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('returns empty array for user with no tandas', async () => {
      const { id } = await registerUser(app, 'v@example.com', 'V');
      const res = await request(app).get(`/api/tandas?userId=${id}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/tandas/:id', () => {
    it('returns tanda details', async () => {
      const { token } = await registerUser(app, 'g@example.com', 'G');
      const created = await createTanda(app, token);

      const res = await request(app).get(`/api/tandas/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    it('returns 404 for unknown tanda', async () => {
      const res = await request(app).get('/api/tandas/no-such-tanda');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/tandas/:id/join', () => {
    it('allows a user to join a FORMING tanda (201)', async () => {
      const { token: orgToken } = await registerUser(app, 'org3@example.com', 'Org3');
      const { token: memberToken } = await registerUser(app, 'mem@example.com', 'Member');

      const tanda = await createTanda(app, orgToken);
      const res = await request(app)
        .post(`/api/tandas/${tanda.body.id}/join`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('member');
    });

    it('returns 409 when user tries to join twice', async () => {
      const { token } = await registerUser(app, 'dup@example.com', 'Dup');
      const tanda = await createTanda(app, token);

      // organizer already joined implicitly; try again
      const res = await request(app)
        .post(`/api/tandas/${tanda.body.id}/join`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(409);
    });

    it('returns 422 when tanda is not FORMING', async () => {
      const { token: ot } = await registerUser(app, 'oa@example.com', 'OA');
      const { token: m1t } = await registerUser(app, 'ma@example.com', 'MA');
      const { token: m2t } = await registerUser(app, 'mb@example.com', 'MB');
      const { token: m3t } = await registerUser(app, 'mc@example.com', 'MC');

      const tanda = await createTanda(app, ot);
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m1t}`);
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m2t}`);
      await request(app).post(`/api/tandas/${tanda.body.id}/start`).set('Authorization', `Bearer ${ot}`);

      const res = await request(app)
        .post(`/api/tandas/${tanda.body.id}/join`)
        .set('Authorization', `Bearer ${m3t}`);
      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/tandas/:id/start', () => {
    it('starts the tanda (FORMING → ACTIVE)', async () => {
      const { token: ot } = await registerUser(app, 'st_org@example.com', 'StOrg');
      const { token: m1t } = await registerUser(app, 'st_m1@example.com', 'StM1');
      const { token: m2t } = await registerUser(app, 'st_m2@example.com', 'StM2');

      const tanda = await createTanda(app, ot);
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m1t}`);
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m2t}`);

      const res = await request(app)
        .post(`/api/tandas/${tanda.body.id}/start`)
        .set('Authorization', `Bearer ${ot}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('active');
      expect(res.body.current_round).toBe(1);
    });

    it('returns 422 with fewer than 3 participants', async () => {
      const { token: ot } = await registerUser(app, 'st2_org@example.com', 'St2Org');
      const { token: m1t } = await registerUser(app, 'st2_m1@example.com', 'St2M1');

      const tanda = await createTanda(app, ot);
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m1t}`);

      const res = await request(app)
        .post(`/api/tandas/${tanda.body.id}/start`)
        .set('Authorization', `Bearer ${ot}`);
      expect(res.status).toBe(422);
    });

    it('returns 403 when non-organizer tries to start', async () => {
      const { token: ot } = await registerUser(app, 'st3_org@example.com', 'St3Org');
      const { token: m1t } = await registerUser(app, 'st3_m1@example.com', 'St3M1');
      const { token: m2t } = await registerUser(app, 'st3_m2@example.com', 'St3M2');

      const tanda = await createTanda(app, ot);
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m1t}`);
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m2t}`);

      const res = await request(app)
        .post(`/api/tandas/${tanda.body.id}/start`)
        .set('Authorization', `Bearer ${m1t}`);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/tandas/:id/cancel', () => {
    it('cancels a FORMING tanda (organizer)', async () => {
      const { token } = await registerUser(app, 'can_org@example.com', 'CanOrg');
      const tanda = await createTanda(app, token);

      const res = await request(app)
        .post(`/api/tandas/${tanda.body.id}/cancel`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
    });

    it('returns 403 when non-organizer tries to cancel', async () => {
      const { token: ot } = await registerUser(app, 'can2_org@example.com', 'Can2Org');
      const { token: mt } = await registerUser(app, 'can2_mem@example.com', 'Can2Mem');

      const tanda = await createTanda(app, ot);
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${mt}`);

      const res = await request(app)
        .post(`/api/tandas/${tanda.body.id}/cancel`)
        .set('Authorization', `Bearer ${mt}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/tandas/:id/participants', () => {
    it('lists participants', async () => {
      const { token: ot } = await registerUser(app, 'lp_org@example.com', 'LpOrg');
      const { token: mt } = await registerUser(app, 'lp_mem@example.com', 'LpMem');

      const tanda = await createTanda(app, ot);
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${mt}`);

      const res = await request(app).get(`/api/tandas/${tanda.body.id}/participants`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('POST /api/tandas/:id/contributions', () => {
    it('records a contribution (201)', async () => {
      const { token: ot } = await registerUser(app, 'co_org@example.com', 'CoOrg');
      const { token: m1t } = await registerUser(app, 'co_m1@example.com', 'CoM1');
      const { token: m2t } = await registerUser(app, 'co_m2@example.com', 'CoM2');

      const tanda = await createTanda(app, ot);
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m1t}`);
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m2t}`);
      await request(app).post(`/api/tandas/${tanda.body.id}/start`).set('Authorization', `Bearer ${ot}`);

      const res = await request(app)
        .post(`/api/tandas/${tanda.body.id}/contributions`)
        .set('Authorization', `Bearer ${ot}`)
        .send({ amount: 1000 });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('paid');
    });

    it('returns 409 when contributing twice in same round', async () => {
      const { token: ot } = await registerUser(app, 'co2_org@example.com', 'Co2Org');
      const { token: m1t } = await registerUser(app, 'co2_m1@example.com', 'Co2M1');
      const { token: m2t } = await registerUser(app, 'co2_m2@example.com', 'Co2M2');

      const tanda = await createTanda(app, ot);
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m1t}`);
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m2t}`);
      await request(app).post(`/api/tandas/${tanda.body.id}/start`).set('Authorization', `Bearer ${ot}`);

      await request(app)
        .post(`/api/tandas/${tanda.body.id}/contributions`)
        .set('Authorization', `Bearer ${ot}`)
        .send({ amount: 1000 });

      const res = await request(app)
        .post(`/api/tandas/${tanda.body.id}/contributions`)
        .set('Authorization', `Bearer ${ot}`)
        .send({ amount: 1000 });

      expect(res.status).toBe(409);
    });

    it('returns 422 for non-active tanda', async () => {
      const { token } = await registerUser(app, 'co3_org@example.com', 'Co3Org');
      const tanda = await createTanda(app, token);

      const res = await request(app)
        .post(`/api/tandas/${tanda.body.id}/contributions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 1000 });

      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/tandas/:id/rounds/:round', () => {
    it('returns round summary', async () => {
      const { token: ot } = await registerUser(app, 'rs_org@example.com', 'RsOrg');
      const { token: m1t } = await registerUser(app, 'rs_m1@example.com', 'RsM1');
      const { token: m2t } = await registerUser(app, 'rs_m2@example.com', 'RsM2');

      const tanda = await createTanda(app, ot, { totalRounds: 3 });
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m1t}`);
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m2t}`);
      await request(app).post(`/api/tandas/${tanda.body.id}/start`).set('Authorization', `Bearer ${ot}`);

      const res = await request(app).get(`/api/tandas/${tanda.body.id}/rounds/1`);
      expect(res.status).toBe(200);
      expect(res.body.round).toBe(1);
    });

    it('returns 422 for out-of-range round', async () => {
      const { token: ot } = await registerUser(app, 'rs2_org@example.com', 'Rs2Org');
      const { token: m1t } = await registerUser(app, 'rs2_m1@example.com', 'Rs2M1');
      const { token: m2t } = await registerUser(app, 'rs2_m2@example.com', 'Rs2M2');

      const tanda = await createTanda(app, ot, { totalRounds: 3 });
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m1t}`);
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m2t}`);
      await request(app).post(`/api/tandas/${tanda.body.id}/start`).set('Authorization', `Bearer ${ot}`);

      const res = await request(app).get(`/api/tandas/${tanda.body.id}/rounds/99`);
      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/tandas/:id/advance', () => {
    it('advances to round 2', async () => {
      const { token: ot } = await registerUser(app, 'adv_org@example.com', 'AdvOrg');
      const { token: m1t } = await registerUser(app, 'adv_m1@example.com', 'AdvM1');
      const { token: m2t } = await registerUser(app, 'adv_m2@example.com', 'AdvM2');

      const tanda = await createTanda(app, ot, { totalRounds: 3 });
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m1t}`);
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m2t}`);
      await request(app).post(`/api/tandas/${tanda.body.id}/start`).set('Authorization', `Bearer ${ot}`);

      const res = await request(app)
        .post(`/api/tandas/${tanda.body.id}/advance`)
        .set('Authorization', `Bearer ${ot}`);

      expect(res.status).toBe(200);
      expect(res.body.current_round).toBe(2);
      expect(res.body.status).toBe('active');
    });

    it('auto-completes after last round', async () => {
      const { token: ot } = await registerUser(app, 'aac_org@example.com', 'AacOrg');
      const { token: m1t } = await registerUser(app, 'aac_m1@example.com', 'AacM1');
      const { token: m2t } = await registerUser(app, 'aac_m2@example.com', 'AacM2');

      const tanda = await createTanda(app, ot, { totalRounds: 3 });
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m1t}`);
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m2t}`);
      await request(app).post(`/api/tandas/${tanda.body.id}/start`).set('Authorization', `Bearer ${ot}`);

      // Advance 3 times (rounds 1, 2, 3)
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(`/api/tandas/${tanda.body.id}/advance`)
          .set('Authorization', `Bearer ${ot}`);
      }

      const res = await request(app).get(`/api/tandas/${tanda.body.id}`);
      expect(res.body.status).toBe('completed');
    });

    it('returns 403 when non-organizer tries to advance', async () => {
      const { token: ot } = await registerUser(app, 'adv3_org@example.com', 'Adv3Org');
      const { token: m1t } = await registerUser(app, 'adv3_m1@example.com', 'Adv3M1');
      const { token: m2t } = await registerUser(app, 'adv3_m2@example.com', 'Adv3M2');

      const tanda = await createTanda(app, ot, { totalRounds: 3 });
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m1t}`);
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m2t}`);
      await request(app).post(`/api/tandas/${tanda.body.id}/start`).set('Authorization', `Bearer ${ot}`);

      const res = await request(app)
        .post(`/api/tandas/${tanda.body.id}/advance`)
        .set('Authorization', `Bearer ${m1t}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/tandas/:id/participants/:pid/history', () => {
    it('returns contribution history', async () => {
      const { token: ot } = await registerUser(app, 'ph_org@example.com', 'PhOrg');
      const { token: m1t } = await registerUser(app, 'ph_m1@example.com', 'PhM1');
      const { token: m2t } = await registerUser(app, 'ph_m2@example.com', 'PhM2');

      const tanda = await createTanda(app, ot, { totalRounds: 3 });
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m1t}`);
      await request(app).post(`/api/tandas/${tanda.body.id}/join`).set('Authorization', `Bearer ${m2t}`);
      await request(app).post(`/api/tandas/${tanda.body.id}/start`).set('Authorization', `Bearer ${ot}`);

      await request(app)
        .post(`/api/tandas/${tanda.body.id}/contributions`)
        .set('Authorization', `Bearer ${ot}`)
        .send({ amount: 1000 });

      const participants = await request(app).get(`/api/tandas/${tanda.body.id}/participants`);
      const orgParticipant = participants.body.find((p: { role: string }) => p.role === 'organizer');

      const res = await request(app).get(`/api/tandas/${tanda.body.id}/participants/${orgParticipant.id}/history`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('returns 404 for unknown participant', async () => {
      const { token: ot } = await registerUser(app, 'ph2_org@example.com', 'Ph2Org');
      const tanda = await createTanda(app, ot);

      const res = await request(app).get(`/api/tandas/${tanda.body.id}/participants/no-pid/history`);
      expect(res.status).toBe(404);
    });
  });
});
