import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import type { Application } from 'express';

async function createTestUsers(app: Application): Promise<{
  userId1: number;
  userId2: number;
  userId3: number;
}> {
  const user1 = await request(app)
    .post('/api/users')
    .send({ email: 'alice@example.com', name: 'Alice' });

  const user2 = await request(app)
    .post('/api/users')
    .send({ email: 'bob@example.com', name: 'Bob' });

  const user3 = await request(app)
    .post('/api/users')
    .send({ email: 'charlie@example.com', name: 'Charlie' });

  return {
    userId1: user1.body.id,
    userId2: user2.body.id,
    userId3: user3.body.id,
  };
}

describe('Tanda API', () => {
  describe('POST /api/tandas', () => {
    it('should create a new tanda', async () => {
      const app = createApp();
      const { userId1 } = await createTestUsers(app);

      const response = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: userId1,
          contributionAmount: 1000,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        name: 'Tanda Enero',
        organizerId: userId1,
        contributionAmount: 1000,
        status: 'forming',
        currentRound: 0,
        totalRounds: 0,
      });
    });

    it('should return 404 for non-existent organizer', async () => {
      const app = createApp();
      const response = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: 999,
          contributionAmount: 1000,
        })
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'NotFoundError',
      });
    });

    it('should return 400 for invalid contribution amount', async () => {
      const app = createApp();
      const { userId1 } = await createTestUsers(app);

      const response = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: userId1,
          contributionAmount: -100,
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'ValidationError',
      });
    });
  });

  describe('POST /api/tandas/:id/join', () => {
    it('should allow user to join a tanda', async () => {
      const app = createApp();
      const { userId1, userId2 } = await createTestUsers(app);

      const tanda = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: userId1,
          contributionAmount: 1000,
        });

      const tandaId = tanda.body.id;

      const response = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: userId2 })
        .expect(201);

      expect(response.body).toMatchObject({
        userId: userId2,
        tandaId: tandaId,
        role: 'member',
      });
    });

    it('should return 422 for duplicate join', async () => {
      const app = createApp();
      const { userId1, userId2 } = await createTestUsers(app);

      const tanda = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: userId1,
          contributionAmount: 1000,
        });

      const tandaId = tanda.body.id;

      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: userId2 })
        .expect(201);

      const response = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: userId2 })
        .expect(422);

      expect(response.body).toMatchObject({
        error: 'BusinessRuleError',
      });
    });
  });

  describe('POST /api/tandas/:id/start', () => {
    it('should start a tanda with minimum participants', async () => {
      const app = createApp();
      const { userId1, userId2, userId3 } = await createTestUsers(app);

      const tanda = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: userId1,
          contributionAmount: 1000,
        });

      const tandaId = tanda.body.id;

      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: userId2 });

      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: userId3 });

      const response = await request(app)
        .post(`/api/tandas/${tandaId}/start`)
        .send({ organizerId: userId1 })
        .expect(200);

      expect(response.body).toMatchObject({
        id: tandaId,
        status: 'active',
        currentRound: 1,
        totalRounds: 3,
        startedAt: expect.any(String),
      });
    });

    it('should return 422 if not enough participants', async () => {
      const app = createApp();
      const { userId1 } = await createTestUsers(app);

      const tanda = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: userId1,
          contributionAmount: 1000,
        });

      const tandaId = tanda.body.id;

      const response = await request(app)
        .post(`/api/tandas/${tandaId}/start`)
        .send({ organizerId: userId1 })
        .expect(422);

      expect(response.body).toMatchObject({
        error: 'BusinessRuleError',
      });
    });

    it('should return 403 if not the organizer', async () => {
      const app = createApp();
      const { userId1, userId2, userId3 } = await createTestUsers(app);

      const tanda = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: userId1,
          contributionAmount: 1000,
        });

      const tandaId = tanda.body.id;

      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: userId2 });

      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: userId3 });

      const response = await request(app)
        .post(`/api/tandas/${tandaId}/start`)
        .send({ organizerId: userId2 })
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'ForbiddenError',
      });
    });
  });

  describe('GET /api/tandas', () => {
    it('should list tandas for a user', async () => {
      const app = createApp();
      const { userId1, userId2 } = await createTestUsers(app);

      const tanda1 = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: userId1,
          contributionAmount: 1000,
        });

      const tanda2 = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Febrero',
          organizerId: userId2,
          contributionAmount: 2000,
        });

      await request(app)
        .post(`/api/tandas/${tanda2.body.id}/join`)
        .send({ userId: userId1 });

      const response = await request(app)
        .get(`/api/tandas?userId=${userId1}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('should return 400 if userId is missing', async () => {
      const app = createApp();
      const response = await request(app).get('/api/tandas').expect(400);

      expect(response.body).toMatchObject({
        error: 'ValidationError',
      });
    });
  });

  describe('GET /api/tandas/:id/participants', () => {
    it('should list participants', async () => {
      const app = createApp();
      const { userId1, userId2 } = await createTestUsers(app);

      const tanda = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: userId1,
          contributionAmount: 1000,
        });

      const tandaId = tanda.body.id;

      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: userId2 });

      const response = await request(app)
        .get(`/api/tandas/${tandaId}/participants`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        userId: userId1,
        role: 'organizer',
      });
    });
  });
});
