/**
 * Comprehensive Test Suite for Tanda API
 * Tests all happy paths and error cases
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../src/index.js';

let app: Express;

beforeEach(() => {
  app = createApp();
});

describe('Tanda API - Users', () => {
  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'alice@example.com',
          name: 'Alice',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe('alice@example.com');
      expect(response.body.name).toBe('Alice');
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/api/users')
        .send({
          email: 'alice@example.com',
          name: 'Alice',
        });

      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'alice@example.com',
          name: 'Another Alice',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'not-an-email',
          name: 'Alice',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing name', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'alice@example.com',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/users', () => {
    it('should list all users', async () => {
      await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' });

      await request(app)
        .post('/api/users')
        .send({ email: 'bob@example.com', name: 'Bob' });

      const response = await request(app).get('/api/users');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by id', async () => {
      const createRes = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' });

      const userId = createRes.body.id;

      const response = await request(app).get(`/api/users/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe('alice@example.com');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});

describe('Tanda API - Tandas', () => {
  let organizerId: string;
  let userId2: string;
  let userId3: string;

  beforeEach(async () => {
    const res1 = await request(app)
      .post('/api/users')
      .send({ email: 'organizer@example.com', name: 'Organizer' });
    organizerId = res1.body.id;

    const res2 = await request(app)
      .post('/api/users')
      .send({ email: 'member2@example.com', name: 'Member 2' });
    userId2 = res2.body.id;

    const res3 = await request(app)
      .post('/api/users')
      .send({ email: 'member3@example.com', name: 'Member 3' });
    userId3 = res3.body.id;
  });

  describe('POST /api/tandas', () => {
    it('should create a tanda', async () => {
      const response = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId,
          contributionAmount: 1000,
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Tanda Enero');
      expect(response.body.status).toBe('forming');
      expect(response.body.currentRound).toBe(0);
      expect(response.body.organizerId).toBe(organizerId);
    });

    it('should auto-join organizer as first participant', async () => {
      const tandaRes = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId,
          contributionAmount: 1000,
        });

      const tandaId = tandaRes.body.id;

      const particRes = await request(app).get(`/api/tandas/${tandaId}/participants`);

      expect(particRes.body.length).toBe(1);
      expect(particRes.body[0].userId).toBe(organizerId);
      expect(particRes.body[0].role).toBe('organizer');
    });

    it('should reject invalid organizer', async () => {
      const response = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: '00000000-0000-0000-0000-000000000000',
          contributionAmount: 1000,
        });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/tandas/:id/join', () => {
    it('should allow user to join tanda', async () => {
      const tandaRes = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId,
          contributionAmount: 1000,
        });

      const tandaId = tandaRes.body.id;

      const response = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: userId2 });

      expect(response.status).toBe(201);
      expect(response.body.userId).toBe(userId2);
      expect(response.body.role).toBe('member');
      expect(response.body.rotationPosition).toBe(2);
    });

    it('should prevent duplicate join', async () => {
      const tandaRes = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId,
          contributionAmount: 1000,
        });

      const tandaId = tandaRes.body.id;

      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: userId2 });

      const response = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: userId2 });

      expect(response.status).toBe(409);
    });

    it('should prevent join when tanda is active', async () => {
      const tandaRes = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId,
          contributionAmount: 1000,
        });

      const tandaId = tandaRes.body.id;

      // Add minimum participants
      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: userId2 });

      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: userId3 });

      // Start tanda
      await request(app)
        .post(`/api/tandas/${tandaId}/start`)
        .set('x-user-id', organizerId);

      // Try to join after start
      const res4 = await request(app)
        .post('/api/users')
        .send({ email: 'newcomer@example.com', name: 'Newcomer' });

      const response = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: res4.body.id });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    });
  });

  describe('POST /api/tandas/:id/start', () => {
    it('should start tanda with 3 or more participants', async () => {
      const tandaRes = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId,
          contributionAmount: 1000,
        });

      const tandaId = tandaRes.body.id;

      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: userId2 });

      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: userId3 });

      const response = await request(app)
        .post(`/api/tandas/${tandaId}/start`)
        .set('x-user-id', organizerId);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('active');
      expect(response.body.currentRound).toBe(1);
      expect(response.body.totalRounds).toBe(3);
    });

    it('should reject start with < 3 participants', async () => {
      const tandaRes = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId,
          contributionAmount: 1000,
        });

      const tandaId = tandaRes.body.id;

      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: userId2 });

      const response = await request(app)
        .post(`/api/tandas/${tandaId}/start`)
        .set('x-user-id', organizerId);

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    });

    it('should reject start by non-organizer', async () => {
      const tandaRes = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId,
          contributionAmount: 1000,
        });

      const tandaId = tandaRes.body.id;

      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: userId2 });

      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: userId3 });

      const response = await request(app)
        .post(`/api/tandas/${tandaId}/start`)
        .set('x-user-id', userId2);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/tandas/:id/cancel', () => {
    it('should cancel tanda', async () => {
      const tandaRes = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId,
          contributionAmount: 1000,
        });

      const tandaId = tandaRes.body.id;

      const response = await request(app)
        .post(`/api/tandas/${tandaId}/cancel`)
        .set('x-user-id', organizerId);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('cancelled');
    });

    it('should reject cancel by non-organizer', async () => {
      const tandaRes = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId,
          contributionAmount: 1000,
        });

      const tandaId = tandaRes.body.id;

      const response = await request(app)
        .post(`/api/tandas/${tandaId}/cancel`)
        .set('x-user-id', userId2);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/tandas?userId=xxx', () => {
    it('should filter tandas by user', async () => {
      const tandaRes = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId,
          contributionAmount: 1000,
        });

      const response = await request(app)
        .get(`/api/tandas?userId=${organizerId}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].organizerId).toBe(organizerId);
    });
  });
});

describe('Tanda API - Contributions', () => {
  let tandaId: string;
  let organizerId: string;
  let participantId1: string;
  let participantId2: string;
  let participantId3: string;

  beforeEach(async () => {
    const orgRes = await request(app)
      .post('/api/users')
      .send({ email: 'organizer@example.com', name: 'Organizer' });
    organizerId = orgRes.body.id;

    const u2Res = await request(app)
      .post('/api/users')
      .send({ email: 'user2@example.com', name: 'User 2' });
    const userId2 = u2Res.body.id;

    const u3Res = await request(app)
      .post('/api/users')
      .send({ email: 'user3@example.com', name: 'User 3' });
    const userId3 = u3Res.body.id;

    const tandaRes = await request(app)
      .post('/api/tandas')
      .send({
        name: 'Tanda Test',
        organizerId,
        contributionAmount: 1000,
      });
    tandaId = tandaRes.body.id;

    await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: userId2 });

    await request(app)
      .post(`/api/tandas/${tandaId}/join`)
      .send({ userId: userId3 });

    const startRes = await request(app)
      .post(`/api/tandas/${tandaId}/start`)
      .set('x-user-id', organizerId);

    const participantsRes = await request(app)
      .get(`/api/tandas/${tandaId}/participants`);

    participantId1 = participantsRes.body[0].id;
    participantId2 = participantsRes.body[1].id;
    participantId3 = participantsRes.body[2].id;
  });

  describe('POST /api/tandas/:id/contributions', () => {
    it('should record a contribution', async () => {
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({
          participantId: participantId1,
          amount: 1000,
        });

      expect(response.status).toBe(201);
      expect(response.body.tandaId).toBe(tandaId);
      expect(response.body.amount).toBe(1000);
      expect(response.body.status).toBe('paid');
    });

    it('should prevent duplicate contribution recording', async () => {
      await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({
          participantId: participantId1,
          amount: 1000,
        });

      const response = await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({
          participantId: participantId1,
          amount: 1000,
        });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/tandas/:id/rounds/:round', () => {
    it('should get round summary', async () => {
      await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({
          participantId: participantId1,
          amount: 1000,
        });

      await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({
          participantId: participantId2,
          amount: 1000,
        });

      const response = await request(app)
        .get(`/api/tandas/${tandaId}/rounds/1`);

      expect(response.status).toBe(200);
      expect(response.body.round).toBe(1);
      expect(response.body.contributorCount).toBe(2);
      expect(response.body.totalAmount).toBe(2000);
    });
  });

  describe('GET /api/tandas/:id/participants/:pid/history', () => {
    it('should get participant contribution history', async () => {
      await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .send({
          participantId: participantId1,
          amount: 1000,
        });

      const response = await request(app)
        .get(`/api/tandas/${tandaId}/participants/${participantId1}/history`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].participantId).toBe(participantId1);
    });
  });

  describe('POST /api/tandas/:id/advance', () => {
    it('should advance to next round', async () => {
      // Record all contributions for round 1
      const particRes = await request(app)
        .get(`/api/tandas/${tandaId}/participants`);

      for (const participant of particRes.body) {
        await request(app)
          .post(`/api/tandas/${tandaId}/contributions`)
          .send({
            participantId: participant.id,
            amount: 1000,
          });
      }

      const response = await request(app)
        .post(`/api/tandas/${tandaId}/advance`)
        .set('x-user-id', organizerId);

      expect(response.status).toBe(200);
      expect(response.body.tanda.currentRound).toBe(2);
    });

    it('should reject advance by non-organizer', async () => {
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/advance`)
        .set('x-user-id', participantId1);

      expect(response.status).toBe(403);
    });

    it('should reject advance with pending contributions', async () => {
      const response = await request(app)
        .post(`/api/tandas/${tandaId}/advance`)
        .set('x-user-id', organizerId);

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    });
  });
});

describe('Health Check', () => {
  it('should return health status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body).toHaveProperty('timestamp');
  });
});
