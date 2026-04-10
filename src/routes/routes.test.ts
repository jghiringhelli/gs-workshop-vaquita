import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import request from 'supertest';
import express from 'express';
import { resetDatabase } from '../db';
import { ServiceFactory } from '../services';
import { createUserRoutes } from './users';
import { createTandaRoutes } from './tandas';
import { errorHandler } from './middleware';
import { initializeDatabase } from '../db/schema';

describe('API Endpoints', () => {
  let app: express.Application;
  let dbPath: string;

  beforeEach(() => {
    const ts = Date.now() + Math.random();
    dbPath = path.join(process.cwd(), `test-api-${ts}.db`);
    process.env.DB_PATH = dbPath;

    // Reset singleton
    resetDatabase();

    // Create fresh DB
    const db = initializeDatabase();
    const services = new ServiceFactory(db);

    // Create express app
    app = express();
    app.use(express.json());
    app.use('/api/users', createUserRoutes(services));
    app.use('/api/tandas', createTandaRoutes(services));
    app.use(errorHandler);
  });

  afterEach(() => {
    resetDatabase();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    delete process.env.DB_PATH;
  });

  describe('User Endpoints', () => {
    it('POST /api/users - should create a user', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' })
        .expect(201);

      expect(res.body).toMatchObject({
        email: 'alice@example.com',
        name: 'Alice',
      });
      expect(res.body.id).toBeDefined();
    });

    it('POST /api/users - should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'invalid-email', name: 'Alice' })
        .expect(400);

      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/users - should reject duplicate email', async () => {
      await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' });

      const res = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice 2' })
        .expect(400);

      expect(res.body.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('GET /api/users - should list users', async () => {
      await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' });

      await request(app)
        .post('/api/users')
        .send({ email: 'bob@example.com', name: 'Bob' });

      const res = await request(app).get('/api/users').expect(200);

      expect(res.body).toHaveLength(2);
    });

    it('GET /api/users/:id - should get user by id', async () => {
      const createRes = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' });

      const res = await request(app)
        .get(`/api/users/${createRes.body.id}`)
        .expect(200);

      expect(res.body).toEqual(createRes.body);
    });

    it('GET /api/users/:id - should return 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/api/users/non-existent')
        .expect(404);

      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  describe('Tanda Endpoints', () => {
    let organizerId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'organizer@example.com', name: 'Organizer' });
      organizerId = res.body.id;
    });

    it('POST /api/tandas - should create a tanda', async () => {
      const res = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId,
          contributionAmount: 1000,
          totalRounds: 12,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        name: 'Tanda Enero',
        organizerId,
        contributionAmount: 1000,
        totalRounds: 12,
        status: 'forming',
      });
    });

    it('GET /api/tandas - should list tandas', async () => {
      const tanda1 = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda 1',
          organizerId,
          contributionAmount: 1000,
          totalRounds: 12,
        });

      const res = await request(app).get('/api/tandas').expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(tanda1.body.id);
    });

    it('GET /api/tandas?userId= - should filter by userId', async () => {
      const user2 = await request(app)
        .post('/api/users')
        .send({ email: 'user2@example.com', name: 'User 2' });

      await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda 1',
          organizerId,
          contributionAmount: 1000,
          totalRounds: 12,
        });

      await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda 2',
          organizerId: user2.body.id,
          contributionAmount: 1000,
          totalRounds: 12,
        });

      const res = await request(app)
        .get(`/api/tandas?userId=${organizerId}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
    });

    it('GET /api/tandas/:id - should get tanda details', async () => {
      const created = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Test Tanda',
          organizerId,
          contributionAmount: 1000,
          totalRounds: 12,
        });

      const res = await request(app)
        .get(`/api/tandas/${created.body.id}`)
        .expect(200);

      expect(res.body).toEqual(created.body);
    });

    it('POST /api/tandas/:id/join - should join tanda', async () => {
      const user2 = await request(app)
        .post('/api/users')
        .send({ email: 'user2@example.com', name: 'User 2' });

      const tanda = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Test Tanda',
          organizerId,
          contributionAmount: 1000,
          totalRounds: 12,
        });

      await request(app)
        .post(`/api/tandas/${tanda.body.id}/join`)
        .send({ userId: user2.body.id })
        .expect(204);

      const participants = await request(app)
        .get(`/api/tandas/${tanda.body.id}/participants`)
        .expect(200);

      expect(participants.body).toHaveLength(2);
    });

    it('POST /api/tandas/:id/join - should reject duplicate participant', async () => {
      const user2 = await request(app)
        .post('/api/users')
        .send({ email: 'user2@example.com', name: 'User 2' });

      const tanda = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Test Tanda',
          organizerId,
          contributionAmount: 1000,
          totalRounds: 12,
        });

      await request(app)
        .post(`/api/tandas/${tanda.body.id}/join`)
        .send({ userId: user2.body.id })
        .expect(204);

      const res = await request(app)
        .post(`/api/tandas/${tanda.body.id}/join`)
        .send({ userId: user2.body.id })
        .expect(409);

      expect(res.body.code).toBe('ALREADY_PARTICIPANT');
    });

    it('GET /api/tandas/:id/participants - should list participants', async () => {
      const tanda = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Test Tanda',
          organizerId,
          contributionAmount: 1000,
          totalRounds: 12,
        });

      const res = await request(app)
        .get(`/api/tandas/${tanda.body.id}/participants`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].role).toBe('organizer');
    });
  });
});
