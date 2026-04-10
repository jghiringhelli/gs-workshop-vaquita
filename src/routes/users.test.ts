import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import Database from 'better-sqlite3';
import { UserRepository } from '../repositories/user-repository';
import { UserService } from '../services/user.service';
import { createUserRoutes } from '../routes/users';
import { errorHandler, notFoundHandler } from '../middleware/error-handler';

describe('User Routes', () => {
  let app: Express;
  let db: Database.Database;
  let userService: UserService;

  beforeEach(() => {
    // Create in-memory database for testing
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
    `);

    // Setup app
    const userRepository = new UserRepository(db);
    userService = new UserService(userRepository);

    app = express();
    app.use(express.json());
    app.use('/api/users', createUserRoutes(userService));
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  afterEach(() => {
    db.close();
  });

  describe('POST /api/users', () => {
    it('should create a user successfully', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          email: 'alice@example.com',
          name: 'Alice',
        })
        .expect(201);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.email).toBe('alice@example.com');
      expect(res.body.data.name).toBe('Alice');
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.createdAt).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/api/users')
        .send({
          email: 'alice@example.com',
          name: 'Alice',
        })
        .expect(201);

      const res = await request(app)
        .post('/api/users')
        .send({
          email: 'alice@example.com',
          name: 'Alice 2',
        })
        .expect(409);

      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          email: 'not-an-email',
          name: 'Alice',
        })
        .expect(422);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          email: 'alice@example.com',
        })
        .expect(422);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/users', () => {
    it('should list empty users initially', async () => {
      const res = await request(app)
        .get('/api/users')
        .expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.meta.count).toBe(0);
    });

    it('should list created users', async () => {
      // Create two users
      await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' });

      await request(app)
        .post('/api/users')
        .send({ email: 'bob@example.com', name: 'Bob' });

      const res = await request(app)
        .get('/api/users')
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.count).toBe(2);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by id', async () => {
      const createRes = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' });

      const userId = createRes.body.data.id;

      const res = await request(app)
        .get(`/api/users/${userId}`)
        .expect(200);

      expect(res.body.data.id).toBe(userId);
      expect(res.body.data.email).toBe('alice@example.com');
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/api/users/invalid-id')
        .expect(404);

      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });
  });
});
