import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { resetDb } from '../db';

describe('Users API', () => {
  beforeEach(() => {
    resetDb();
  });

  describe('POST /api/users', () => {
    it('should create a user', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ email: 'alice@example.com', name: 'Alice' });
      expect(res.body.id).toBeDefined();
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'not-an-email', name: 'Alice' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com' });

      expect(res.status).toBe(400);
    });

    it('should return 409 for duplicate email', async () => {
      await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' });

      const res = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice 2' });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/users', () => {
    it('should list users', async () => {
      await request(app).post('/api/users').send({ email: 'a@b.com', name: 'A' });
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by id', async () => {
      const create = await request(app)
        .post('/api/users')
        .send({ email: 'a@b.com', name: 'A' });

      const res = await request(app).get(`/api/users/${create.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('a@b.com');
    });

    it('should return 404 for unknown id', async () => {
      const res = await request(app).get('/api/users/9999');
      expect(res.status).toBe(404);
    });
  });
});
