import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { createDatabase } from './db/database';

describe('Tandas API', () => {
  let app: ReturnType<typeof createApp>;
  let organizerToken: string;
  let organizerId: string;
  let tandaId: string;

  const createUser = async (email: string, name: string) => {
    const res = await request(app).post('/api/users').send({ email, name }).expect(201);
    return { id: res.body.user.id, token: res.body.token };
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret';
    const db = createDatabase(':memory:');
    app = createApp(db);

    const org = await createUser('org@example.com', 'Organizer Person');
    organizerId = org.id;
    organizerToken = org.token;

    const tanda = await request(app)
      .post('/api/tandas')
      .send({ name: 'Test Tanda', organizerId, contributionAmount: 500 })
      .expect(201);
    tandaId = tanda.body.id;
  });

  describe('POST /api/tandas', () => {
    it('creates a tanda and auto-adds organizer as participant', async () => {
      const res = await request(app)
        .post('/api/tandas')
        .send({ name: 'Nueva Tanda', organizerId, contributionAmount: 1000 })
        .expect(201);
      expect(res.body.status).toBe('forming');
      expect(res.body.organizerId).toBe(organizerId);

      const parts = await request(app).get(`/api/tandas/${res.body.id}/participants`).expect(200);
      expect(parts.body).toHaveLength(1);
      expect(parts.body[0].role).toBe('organizer');
    });

    it('rejects tanda with invalid name', async () => {
      await request(app)
        .post('/api/tandas')
        .send({ name: 'Tanda@#!', organizerId, contributionAmount: 500 })
        .expect(400);
    });

    it('rejects unknown organizer', async () => {
      await request(app)
        .post('/api/tandas')
        .send({ name: 'Bad Tanda', organizerId: '00000000-0000-0000-0000-000000000000', contributionAmount: 500 })
        .expect(404);
    });
  });

  describe('POST /api/tandas/:id/join', () => {
    it('allows a user to join a forming tanda', async () => {
      const member = await createUser('member@example.com', 'Member User');
      const res = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: member.id })
        .expect(201);
      expect(res.body.role).toBe('member');
    });

    it('prevents joining twice', async () => {
      const member = await createUser('member2@example.com', 'Member Two');
      await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: member.id }).expect(201);
      await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: member.id }).expect(409);
    });
  });

  describe('POST /api/tandas/:id/start', () => {
    it('requires auth', async () => {
      await request(app).post(`/api/tandas/${tandaId}/start`).expect(401);
    });

    it('requires minimum 3 participants', async () => {
      const m1 = await createUser('m1@example.com', 'Member One');
      await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: m1.id }).expect(201);
      // only 2 participants — should fail
      await request(app)
        .post(`/api/tandas/${tandaId}/start`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(422);
    });

    it('starts successfully with 3+ participants', async () => {
      const m1 = await createUser('m1b@example.com', 'Member One');
      const m2 = await createUser('m2b@example.com', 'Member Two');
      await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: m1.id }).expect(201);
      await request(app).post(`/api/tandas/${tandaId}/join`).send({ userId: m2.id }).expect(201);

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/start`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);
      expect(res.body.status).toBe('active');
      expect(res.body.totalRounds).toBe(3);
    });
  });

  describe('POST /api/tandas/:id/cancel', () => {
    it('organizer can cancel a forming tanda', async () => {
      const res = await request(app)
        .post(`/api/tandas/${tandaId}/cancel`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);
      expect(res.body.status).toBe('cancelled');
    });

    it('non-organizer cannot cancel', async () => {
      const member = await createUser('cant-cancel@example.com', 'Cannot Cancel');
      await request(app)
        .post(`/api/tandas/${tandaId}/cancel`)
        .set('Authorization', `Bearer ${member.token}`)
        .expect(403);
    });
  });

  describe('POST /api/tandas/:id/contributions', () => {
    it('rejects contributions on non-active tanda', async () => {
      const parts = await request(app).get(`/api/tandas/${tandaId}/participants`).expect(200);
      const participantId = parts.body[0].id;
      await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({ participantId, amount: 500, status: 'paid' })
        .expect(422);
    });
  });

  describe('GET /api/tandas', () => {
    it('requires userId query param', async () => {
      await request(app).get('/api/tandas').expect(400);
    });

    it('lists tandas for a user', async () => {
      const res = await request(app).get(`/api/tandas?userId=${organizerId}`).expect(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('GET /api/tandas/:id', () => {
    it('returns tanda details', async () => {
      const res = await request(app).get(`/api/tandas/${tandaId}`).expect(200);
      expect(res.body.id).toBe(tandaId);
    });

    it('returns 404 for unknown tanda', async () => {
      await request(app).get('/api/tandas/00000000-0000-0000-0000-000000000000').expect(404);
    });
  });
});
