import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import Database from 'better-sqlite3';
import { UserRepository } from '../repositories/user-repository';
import { TandaRepository } from '../repositories/tanda-repository';
import { UserService } from '../services/user.service';
import { TandaService } from '../services/tanda.service';
import { createUserRoutes } from './users';
import { createTandaRoutes } from './tandas';
import { errorHandler, notFoundHandler } from '../middleware/error-handler';

describe('Tanda Routes', () => {
  let app: Express;
  let db: Database.Database;
  let userService: UserService;
  let tandaService: TandaService;
  let testUserId1: string;
  let testUserId2: string;
  let testUserId3: string;

  beforeEach(() => {
    // Create in-memory database
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Initialize schema
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE tandas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        organizer_id TEXT NOT NULL,
        contribution_amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'forming',
        current_round INTEGER NOT NULL DEFAULT 1,
        total_rounds INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organizer_id) REFERENCES users(id)
      );

      CREATE TABLE participants (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        tanda_id TEXT NOT NULL,
        role TEXT NOT NULL,
        rotation_position INTEGER,
        has_received_payout INTEGER NOT NULL DEFAULT 0,
        missed_consecutive INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (tanda_id) REFERENCES tandas(id),
        UNIQUE(user_id, tanda_id)
      );

      CREATE INDEX idx_participants_user_id ON participants(user_id);
      CREATE INDEX idx_participants_tanda_id ON participants(tanda_id);
      CREATE INDEX idx_tandas_organizer ON tandas(organizer_id);
    `);

    // Setup services
    const userRepository = new UserRepository(db);
    const tandaRepository = new TandaRepository(db);
    userService = new UserService(userRepository);
    tandaService = new TandaService(tandaRepository, userRepository);

    // Create test users
    const user1 = userService.createUser('alice@example.com', 'Alice');
    const user2 = userService.createUser('bob@example.com', 'Bob');
    const user3 = userService.createUser('charlie@example.com', 'Charlie');
    testUserId1 = user1.id;
    testUserId2 = user2.id;
    testUserId3 = user3.id;

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/users', createUserRoutes(userService));
    app.use('/api/tandas', createTandaRoutes(tandaService));
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  afterEach(() => {
    db.close();
  });

  describe('POST /api/tandas', () => {
    it('should create a tanda successfully', async () => {
      const res = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: testUserId1,
          contributionAmount: 1000,
          totalRounds: 3,
        })
        .expect(201);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe('Tanda Enero');
      expect(res.body.data.organizerId).toBe(testUserId1);
      expect(res.body.data.status).toBe('forming');
      expect(res.body.data.currentRound).toBe(1);
    });

    it('should reject invalid organizer', async () => {
      const invalidUserId = '00000000-0000-0000-0000-000000000000'; // Valid UUID but non-existent
      const res = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: invalidUserId,
          contributionAmount: 1000,
          totalRounds: 3,
        })
        .expect(404);

      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should reject negative amount', async () => {
      const res = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: testUserId1,
          contributionAmount: -100,
          totalRounds: 3,
        })
        .expect(422);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/tandas', () => {
    it('should list tandas for user', async () => {
      // Create a tanda
      await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda 1',
          organizerId: testUserId1,
          contributionAmount: 1000,
          totalRounds: 3,
        });

      const res = await request(app)
        .get('/api/tandas')
        .query({ userId: testUserId1 })
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.count).toBe(1);
      expect(res.body.data[0].name).toBe('Tanda 1');
    });

    it('should require userId query param', async () => {
      const res = await request(app)
        .get('/api/tandas')
        .expect(422);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/tandas/:id', () => {
    it('should get tanda by id', async () => {
      const createRes = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: testUserId1,
          contributionAmount: 1000,
          totalRounds: 3,
        });

      const tandaId = createRes.body.data.id;

      const res = await request(app)
        .get(`/api/tandas/${tandaId}`)
        .expect(200);

      expect(res.body.data.id).toBe(tandaId);
      expect(res.body.data.name).toBe('Tanda Enero');
    });

    it('should return 404 for non-existent tanda', async () => {
      const invalidTandaId = '00000000-0000-0000-0000-000000000000'; // Valid UUID but non-existent
      const res = await request(app)
        .get(`/api/tandas/${invalidTandaId}`)
        .expect(404);

      expect(res.body.error.code).toBe('TANDA_NOT_FOUND');
    });
  });

  describe('POST /api/tandas/:id/join', () => {
    it('should join a tanda successfully', async () => {
      const createRes = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: testUserId1,
          contributionAmount: 1000,
          totalRounds: 3,
        });

      const tandaId = createRes.body.data.id;

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: testUserId2 })
        .expect(200);

      expect(res.body.data.userId).toBe(testUserId2);
      expect(res.body.data.role).toBe('member');
    });

    it('should prevent duplicate join', async () => {
      const createRes = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: testUserId1,
          contributionAmount: 1000,
          totalRounds: 3,
        });

      const tandaId = createRes.body.data.id;

      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: testUserId2 })
        .expect(200);

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: testUserId2 })
        .expect(409);

      expect(res.body.error.code).toBe('ALREADY_PARTICIPANT');
    });
  });

  describe('POST /api/tandas/:id/start', () => {
    it('should start tanda with >= 3 participants', async () => {
      const createRes = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: testUserId1,
          contributionAmount: 1000,
          totalRounds: 3,
        });

      const tandaId = createRes.body.data.id;

      // Join with 2 more users
      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: testUserId2 });

      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: testUserId3 });

      // Start tanda
      const res = await request(app)
        .post(`/api/tandas/${tandaId}/start`)
        .send({ organizerId: testUserId1 })
        .expect(200);

      expect(res.body.data.status).toBe('active');
    });

    it('should reject start with < 3 participants', async () => {
      const createRes = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: testUserId1,
          contributionAmount: 1000,
          totalRounds: 3,
        });

      const tandaId = createRes.body.data.id;

      // Try to start with only 1 participant (organizer)
      const res = await request(app)
        .post(`/api/tandas/${tandaId}/start`)
        .send({ organizerId: testUserId1 })
        .expect(400);

      expect(res.body.error.message).toContain('at least 3 participants');
    });

    it('should reject start if not organizer', async () => {
      const createRes = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: testUserId1,
          contributionAmount: 1000,
          totalRounds: 3,
        });

      const tandaId = createRes.body.data.id;

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/start`)
        .send({ organizerId: testUserId2 })
        .expect(400);

      expect(res.body.error.message).toContain('Only organizer');
    });
  });

  describe('GET /api/tandas/:id/participants', () => {
    it('should list participants', async () => {
      const createRes = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: testUserId1,
          contributionAmount: 1000,
          totalRounds: 3,
        });

      const tandaId = createRes.body.data.id;

      await request(app)
        .post(`/api/tandas/${tandaId}/join`)
        .send({ userId: testUserId2 });

      const res = await request(app)
        .get(`/api/tandas/${tandaId}/participants`)
        .expect(200);

      expect(res.body.data).toHaveLength(2); // organizer + member
      expect(res.body.meta.count).toBe(2);
    });
  });

  describe('POST /api/tandas/:id/cancel', () => {
    it('should cancel a tanda by organizer', async () => {
      const createRes = await request(app)
        .post('/api/tandas')
        .send({
          name: 'Tanda Enero',
          organizerId: testUserId1,
          contributionAmount: 1000,
          totalRounds: 3,
        });

      const tandaId = createRes.body.data.id;

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/cancel`)
        .send({ organizerId: testUserId1 })
        .expect(200);

      expect(res.body.data.status).toBe('cancelled');
    });
  });
});
