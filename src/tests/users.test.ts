import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/schema';
import { createApp } from '../app';

process.env.JWT_SECRET = 'test-secret';

function createTestDb() {
  const db = new Database(':memory:');
  runMigrations(db);
  return db;
}

describe('Users API', () => {
  let db: Database.Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = createTestDb();
    app = createApp(db);
  });

  describe('POST /api/users', () => {
    it('creates a user successfully', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ email: 'alice@example.com', name: 'Alice' });
      expect(res.body.id).toBeDefined();
    });

    it('returns 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'not-an-email', name: 'Alice' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 409 for duplicate email', async () => {
      await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice' });
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice2' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('GET /api/users', () => {
    it('returns list of users', async () => {
      await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice' });
      const res = await request(app).get('/api/users');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
    });

    it('returns empty array when no users', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/users/:id', () => {
    it('returns user by id', async () => {
      const created = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' });

      const res = await request(app).get(`/api/users/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    it('returns 404 for unknown user', async () => {
      const res = await request(app).get('/api/users/nonexistent-id');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
