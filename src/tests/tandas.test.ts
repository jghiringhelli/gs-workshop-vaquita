import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../app';
import { createDatabase } from '../db';
import type { Express } from 'express';

async function createUser(app: Express, email: string, name: string) {
  const res = await request(app).post('/api/users').send({ email, name });
  return res.body as { id: number; email: string; name: string };
}

async function getToken(app: Express, email: string) {
  const res = await request(app).post('/api/auth/login').send({ email });
  return res.body.token as string;
}

async function createTanda(
  app: Express,
  organizerId: number,
  name = 'Test Tanda',
  contributionAmount = 100
) {
  const res = await request(app)
    .post('/api/tandas')
    .send({ name, organizerId, contributionAmount });
  return res.body as { id: number; name: string; organizerId: number; status: string };
}

describe('Tandas API', () => {
  let app: Express;

  beforeEach(() => {
    const db = createDatabase(':memory:');
    app = createApp(db);
  });

  describe('POST /api/tandas', () => {
    it('creates a tanda and auto-joins organizer', async () => {
      const user = await createUser(app, 'org@example.com', 'Organizer');
      const res = await request(app)
        .post('/api/tandas')
        .send({ name: 'My Tanda', organizerId: user.id, contributionAmount: 100 });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('My Tanda');
      expect(res.body.status).toBe('forming');
    });

    it('returns 404 for unknown organizer', async () => {
      const res = await request(app)
        .post('/api/tandas')
        .send({ name: 'My Tanda', organizerId: 9999, contributionAmount: 100 });
      expect(res.status).toBe(404);
    });

    it('returns 400 for missing fields', async () => {
      const res = await request(app).post('/api/tandas').send({ name: 'My Tanda' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tandas', () => {
    it('returns all tandas', async () => {
      const user = await createUser(app, 'org@example.com', 'Organizer');
      await createTanda(app, user.id);
      const res = await request(app).get('/api/tandas');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('filters by userId', async () => {
      const user1 = await createUser(app, 'u1@example.com', 'User1');
      const user2 = await createUser(app, 'u2@example.com', 'User2');
      await createTanda(app, user1.id, 'Tanda1');
      await createTanda(app, user2.id, 'Tanda2');
      const res = await request(app).get(`/api/tandas?userId=${user1.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Tanda1');
    });
  });

  describe('GET /api/tandas/:id', () => {
    it('returns tanda details', async () => {
      const user = await createUser(app, 'org@example.com', 'Organizer');
      const tanda = await createTanda(app, user.id);
      const res = await request(app).get(`/api/tandas/${tanda.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(tanda.id);
    });

    it('returns 404 for unknown tanda', async () => {
      const res = await request(app).get('/api/tandas/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/tandas/:id/join', () => {
    it('allows user to join a forming tanda', async () => {
      const org = await createUser(app, 'org@example.com', 'Organizer');
      const member = await createUser(app, 'member@example.com', 'Member');
      const tanda = await createTanda(app, org.id);
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/join`)
        .send({ userId: member.id });
      expect(res.status).toBe(201);
      expect(res.body.userId).toBe(member.id);
    });

    it('returns 409 if already joined', async () => {
      const org = await createUser(app, 'org@example.com', 'Organizer');
      const tanda = await createTanda(app, org.id);
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/join`)
        .send({ userId: org.id });
      expect(res.status).toBe(409);
    });

    it('returns 422 if tanda is not forming', async () => {
      const org = await createUser(app, 'org@example.com', 'Organizer');
      const u2 = await createUser(app, 'u2@example.com', 'U2');
      const u3 = await createUser(app, 'u3@example.com', 'U3');
      const newUser = await createUser(app, 'new@example.com', 'New');
      const tanda = await createTanda(app, org.id);
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: u2.id });
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: u3.id });
      const token = await getToken(app, org.email);
      await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .set('Authorization', `Bearer ${token}`);
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/join`)
        .send({ userId: newUser.id });
      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/tandas/:id/start', () => {
    it('starts a tanda with enough participants', async () => {
      const org = await createUser(app, 'org@example.com', 'Organizer');
      const u2 = await createUser(app, 'u2@example.com', 'U2');
      const u3 = await createUser(app, 'u3@example.com', 'U3');
      const tanda = await createTanda(app, org.id);
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: u2.id });
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: u3.id });
      const token = await getToken(app, org.email);
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('active');
    });

    it('returns 422 with fewer than 3 participants', async () => {
      const org = await createUser(app, 'org@example.com', 'Organizer');
      const u2 = await createUser(app, 'u2@example.com', 'U2');
      const tanda = await createTanda(app, org.id);
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: u2.id });
      const token = await getToken(app, org.email);
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(422);
    });

    it('returns 403 if not organizer', async () => {
      const org = await createUser(app, 'org@example.com', 'Organizer');
      const u2 = await createUser(app, 'u2@example.com', 'U2');
      const u3 = await createUser(app, 'u3@example.com', 'U3');
      const tanda = await createTanda(app, org.id);
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: u2.id });
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: u3.id });
      const token = await getToken(app, u2.email);
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('returns 401 without auth token', async () => {
      const org = await createUser(app, 'org@example.com', 'Organizer');
      const tanda = await createTanda(app, org.id);
      const res = await request(app).post(`/api/tandas/${tanda.id}/start`);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/tandas/:id/cancel', () => {
    it('cancels a forming tanda', async () => {
      const org = await createUser(app, 'org@example.com', 'Organizer');
      const tanda = await createTanda(app, org.id);
      const token = await getToken(app, org.email);
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/cancel`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
    });

    it('returns 403 if not organizer', async () => {
      const org = await createUser(app, 'org@example.com', 'Organizer');
      const u2 = await createUser(app, 'u2@example.com', 'U2');
      const tanda = await createTanda(app, org.id);
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: u2.id });
      const token = await getToken(app, u2.email);
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/cancel`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('returns 422 if already cancelled', async () => {
      const org = await createUser(app, 'org@example.com', 'Organizer');
      const tanda = await createTanda(app, org.id);
      const token = await getToken(app, org.email);
      await request(app)
        .post(`/api/tandas/${tanda.id}/cancel`)
        .set('Authorization', `Bearer ${token}`);
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/cancel`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/tandas/:id/participants', () => {
    it('returns list of participants', async () => {
      const org = await createUser(app, 'org@example.com', 'Organizer');
      const tanda = await createTanda(app, org.id);
      const res = await request(app).get(`/api/tandas/${tanda.id}/participants`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].role).toBe('organizer');
    });

    it('returns 404 for unknown tanda', async () => {
      const res = await request(app).get('/api/tandas/99999/participants');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/tandas/:id/contributions', () => {
    async function setupActiveTanda(app: Express) {
      const org = await createUser(app, 'org@example.com', 'Organizer');
      const u2 = await createUser(app, 'u2@example.com', 'U2');
      const u3 = await createUser(app, 'u3@example.com', 'U3');
      const tanda = await createTanda(app, org.id);
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: u2.id });
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: u3.id });
      const token = await getToken(app, org.email);
      await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .set('Authorization', `Bearer ${token}`);
      const participantsRes = await request(app).get(`/api/tandas/${tanda.id}/participants`);
      return { tanda, participants: participantsRes.body, token, org, u2, u3 };
    }

    it('records a contribution for the current round', async () => {
      const { tanda, participants } = await setupActiveTanda(app);
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .send({ participantId: participants[0].id, amount: 100 });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('paid');
      expect(res.body.round).toBe(1);
    });

    it('returns 422 if tanda is not active', async () => {
      const org = await createUser(app, 'org@example.com', 'Organizer');
      const tanda = await createTanda(app, org.id);
      const participantsRes = await request(app).get(`/api/tandas/${tanda.id}/participants`);
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .send({ participantId: participantsRes.body[0].id, amount: 100 });
      expect(res.status).toBe(422);
    });

    it('returns 422 for duplicate contribution in same round', async () => {
      const { tanda, participants } = await setupActiveTanda(app);
      await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .send({ participantId: participants[0].id, amount: 100 });
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .send({ participantId: participants[0].id, amount: 100 });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/tandas/:id/rounds/:round', () => {
    it('returns round summary', async () => {
      const org = await createUser(app, 'org@example.com', 'Organizer');
      const u2 = await createUser(app, 'u2@example.com', 'U2');
      const u3 = await createUser(app, 'u3@example.com', 'U3');
      const tanda = await createTanda(app, org.id);
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: u2.id });
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: u3.id });
      const token = await getToken(app, org.email);
      await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .set('Authorization', `Bearer ${token}`);
      const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/1`);
      expect(res.status).toBe(200);
      expect(res.body.round).toBe(1);
      expect(res.body).toHaveProperty('contributions');
      expect(res.body).toHaveProperty('potRecipient');
    });

    it('returns 422 for invalid round number', async () => {
      const org = await createUser(app, 'org@example.com', 'Organizer');
      const u2 = await createUser(app, 'u2@example.com', 'U2');
      const u3 = await createUser(app, 'u3@example.com', 'U3');
      const tanda = await createTanda(app, org.id);
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: u2.id });
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: u3.id });
      const token = await getToken(app, org.email);
      await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .set('Authorization', `Bearer ${token}`);
      const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/99`);
      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/tandas/:id/advance', () => {
    async function setupActiveTanda(app: Express) {
      const org = await createUser(app, 'org@example.com', 'Organizer');
      const u2 = await createUser(app, 'u2@example.com', 'U2');
      const u3 = await createUser(app, 'u3@example.com', 'U3');
      const tanda = await createTanda(app, org.id);
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: u2.id });
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: u3.id });
      const token = await getToken(app, org.email);
      await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .set('Authorization', `Bearer ${token}`);
      return { tanda, token, org };
    }

    it('advances to the next round', async () => {
      const { tanda, token } = await setupActiveTanda(app);
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.currentRound).toBe(2);
    });

    it('completes the tanda after the last round', async () => {
      const { tanda, token } = await setupActiveTanda(app);
      await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .set('Authorization', `Bearer ${token}`);
      await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .set('Authorization', `Bearer ${token}`);
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
    });

    it('returns 403 if not organizer', async () => {
      const { tanda } = await setupActiveTanda(app);
      const nonOrg = await createUser(app, 'other@example.com', 'Other');
      const otherToken = await getToken(app, nonOrg.email);
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(403);
    });

    it('returns 401 without auth', async () => {
      const { tanda } = await setupActiveTanda(app);
      const res = await request(app).post(`/api/tandas/${tanda.id}/advance`);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/tandas/:id/participants/:pid/history', () => {
    it('returns contribution history for a participant', async () => {
      const org = await createUser(app, 'org@example.com', 'Organizer');
      const u2 = await createUser(app, 'u2@example.com', 'U2');
      const u3 = await createUser(app, 'u3@example.com', 'U3');
      const tanda = await createTanda(app, org.id);
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: u2.id });
      await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: u3.id });
      const token = await getToken(app, org.email);
      await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .set('Authorization', `Bearer ${token}`);
      const participantsRes = await request(app).get(`/api/tandas/${tanda.id}/participants`);
      const pid = participantsRes.body[0].id;
      await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .send({ participantId: pid, amount: 100 });
      const res = await request(app).get(`/api/tandas/${tanda.id}/participants/${pid}/history`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('returns 404 for unknown participant', async () => {
      const org = await createUser(app, 'org@example.com', 'Organizer');
      const tanda = await createTanda(app, org.id);
      const res = await request(app).get(`/api/tandas/${tanda.id}/participants/99999/history`);
      expect(res.status).toBe(404);
    });
  });
});
