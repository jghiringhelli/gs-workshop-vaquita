import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { resetDatabase } from '../db/database';

async function createUser(email: string, name: string): Promise<{ id: number; token: string }> {
  const res = await request(app).post('/api/users').send({ email, name });
  return { id: res.body.id, token: res.body.token };
}

async function createTandaWithOrganizer(): Promise<{ tanda: { id: number }; organizer: { id: number; token: string } }> {
  const organizer = await createUser('org@test.com', 'Organizer');
  const res = await request(app)
    .post('/api/tandas')
    .set('Authorization', `Bearer ${organizer.token}`)
    .send({ name: 'Test Tanda', contributionAmount: 1000, totalRounds: 4 });
  return { tanda: res.body, organizer };
}

describe('Tanda endpoints', () => {
  beforeEach(() => {
    resetDatabase();
  });

  describe('POST /api/tandas', () => {
    it('should create a tanda with correct shape', async () => {
      const user = await createUser('org@test.com', 'Org');
      const res = await request(app)
        .post('/api/tandas')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'Mi Tanda', contributionAmount: 500, totalRounds: 4 });

      expect(res.status).toBe(201);
      expect(typeof res.body.id).toBe('number');
      expect(res.body.name).toBe('Mi Tanda');
      expect(res.body.status).toBe('forming');
      expect(typeof res.body.contributionAmount).toBe('number');
      expect(typeof res.body.currentRound).toBe('number');
    });

    it('should auto-join the organizer as a participant', async () => {
      const { tanda, organizer } = await createTandaWithOrganizer();
      const res = await request(app)
        .get(`/api/tandas/${tanda.id}/participants`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].role).toBe('organizer');
    });

    it('should support organizerId in body without token', async () => {
      const user = await createUser('body@test.com', 'BodyUser');
      const res = await request(app)
        .post('/api/tandas')
        .send({ name: 'No Token Tanda', contributionAmount: 200, organizerId: user.id });

      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/tandas/:id', () => {
    it('should return tanda with participants array', async () => {
      const { tanda, organizer } = await createTandaWithOrganizer();
      const res = await request(app)
        .get(`/api/tandas/${tanda.id}`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.status).toBe(200);
      expect(typeof res.body.id).toBe('number');
      expect(Array.isArray(res.body.participants)).toBe(true);
    });

    it('should return 404 for nonexistent tanda', async () => {
      const user = await createUser('t@test.com', 'T');
      const res = await request(app)
        .get('/api/tandas/999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/tandas', () => {
    it('should filter by userId', async () => {
      const { organizer } = await createTandaWithOrganizer();
      const other = await createUser('other@test.com', 'Other');

      const res1 = await request(app).get(`/api/tandas?userId=${organizer.id}`);
      const res2 = await request(app).get(`/api/tandas?userId=${other.id}`);

      expect(res1.body).toHaveLength(1);
      expect(res2.body).toHaveLength(0);
    });
  });

  describe('POST /api/tandas/:id/join', () => {
    it('should allow a user to join a forming tanda', async () => {
      const { tanda } = await createTandaWithOrganizer();
      const member = await createUser('member@test.com', 'Member');

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/join`)
        .set('Authorization', `Bearer ${member.token}`);

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('member');
    });

    it('should return 409 for duplicate join', async () => {
      const { tanda } = await createTandaWithOrganizer();
      const member = await createUser('member@test.com', 'Member');

      await request(app)
        .post(`/api/tandas/${tanda.id}/join`)
        .set('Authorization', `Bearer ${member.token}`);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/join`)
        .set('Authorization', `Bearer ${member.token}`);

      expect(res.status).toBe(409);
    });

    it('should return 400 for joining a non-forming tanda', async () => {
      const { tanda, organizer } = await createTandaWithOrganizer();
      // Add 2 more members to meet minimum
      const m1 = await createUser('m1@test.com', 'M1');
      const m2 = await createUser('m2@test.com', 'M2');
      await request(app).post(`/api/tandas/${tanda.id}/join`).set('Authorization', `Bearer ${m1.token}`);
      await request(app).post(`/api/tandas/${tanda.id}/join`).set('Authorization', `Bearer ${m2.token}`);
      // Start the tanda
      await request(app).post(`/api/tandas/${tanda.id}/start`).set('Authorization', `Bearer ${organizer.token}`);

      const late = await createUser('late@test.com', 'Late');
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/join`)
        .set('Authorization', `Bearer ${late.token}`);

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/tandas/:id/start', () => {
    it('should return 400 with fewer than 3 participants', async () => {
      const { tanda, organizer } = await createTandaWithOrganizer();

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.status).toBe(400);
    });

    it('should return 400 with exactly 2 participants (boundary)', async () => {
      const { tanda, organizer } = await createTandaWithOrganizer();
      const m1 = await createUser('m1@test.com', 'M1');
      await request(app).post(`/api/tandas/${tanda.id}/join`).set('Authorization', `Bearer ${m1.token}`);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.status).toBe(400);
    });

    it('should succeed with exactly 3 participants (boundary)', async () => {
      const { tanda, organizer } = await createTandaWithOrganizer();
      const m1 = await createUser('m1@test.com', 'M1');
      const m2 = await createUser('m2@test.com', 'M2');
      await request(app).post(`/api/tandas/${tanda.id}/join`).set('Authorization', `Bearer ${m1.token}`);
      await request(app).post(`/api/tandas/${tanda.id}/join`).set('Authorization', `Bearer ${m2.token}`);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('active');
      expect(res.body.currentRound).toBe(1);
    });

    it('should return 403 when non-organizer tries to start', async () => {
      const { tanda } = await createTandaWithOrganizer();
      const m1 = await createUser('m1@test.com', 'M1');
      await request(app).post(`/api/tandas/${tanda.id}/join`).set('Authorization', `Bearer ${m1.token}`);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .set('Authorization', `Bearer ${m1.token}`);

      expect(res.status).toBe(403);
    });

    it('should assign unique rotation positions to all participants', async () => {
      const { tanda, organizer } = await createTandaWithOrganizer();
      const m1 = await createUser('m1@test.com', 'M1');
      const m2 = await createUser('m2@test.com', 'M2');
      await request(app).post(`/api/tandas/${tanda.id}/join`).set('Authorization', `Bearer ${m1.token}`);
      await request(app).post(`/api/tandas/${tanda.id}/join`).set('Authorization', `Bearer ${m2.token}`);

      await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .set('Authorization', `Bearer ${organizer.token}`);

      const participants = await request(app)
        .get(`/api/tandas/${tanda.id}/participants`)
        .set('Authorization', `Bearer ${organizer.token}`);

      const positions = participants.body.map((p: { rotationPosition: number }) => p.rotationPosition);
      expect(positions.sort()).toEqual([1, 2, 3]);
    });
  });

  describe('POST /api/tandas/:id/cancel', () => {
    it('should cancel a forming tanda', async () => {
      const { tanda, organizer } = await createTandaWithOrganizer();

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/cancel`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
    });

    it('should return 403 when non-organizer cancels', async () => {
      const { tanda } = await createTandaWithOrganizer();
      const member = await createUser('m@test.com', 'M');
      await request(app).post(`/api/tandas/${tanda.id}/join`).set('Authorization', `Bearer ${member.token}`);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/cancel`)
        .set('Authorization', `Bearer ${member.token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/tandas/:id/participants', () => {
    it('should return correct participant count', async () => {
      const { tanda, organizer } = await createTandaWithOrganizer();
      const m1 = await createUser('m1@test.com', 'M1');
      await request(app).post(`/api/tandas/${tanda.id}/join`).set('Authorization', `Bearer ${m1.token}`);

      const res = await request(app)
        .get(`/api/tandas/${tanda.id}/participants`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('POST /api/tandas/:id/start — auth', () => {
    it('should return 401 without auth token', async () => {
      const { tanda } = await createTandaWithOrganizer();

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`);

      expect(res.status).toBe(401);
    });
  });
});
