import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { closeDatabase } from '../../shared/database';

describe('Users API', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    closeDatabase();
    app = createApp();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('POST /api/users', () => {
    it('creates a user and returns 201 with a token', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ email: 'alice@example.com', name: 'Alice' });
      expect(res.body.id).toBeTruthy();
      expect(res.body.token).toBeTruthy();
    });

    it('returns 409 for duplicate email', async () => {
      await request(app).post('/api/users').send({ email: 'bob@example.com', name: 'Bob' });
      const res = await request(app).post('/api/users').send({ email: 'bob@example.com', name: 'Bob2' });

      expect(res.status).toBe(409);
    });

    it('returns 422 for invalid email', async () => {
      const res = await request(app).post('/api/users').send({ email: 'not-an-email', name: 'X' });
      expect(res.status).toBe(422);
    });

    it('returns 422 for missing name', async () => {
      const res = await request(app).post('/api/users').send({ email: 'x@example.com' });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/users', () => {
    it('returns an empty array when no users exist', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns all registered users', async () => {
      await request(app).post('/api/users').send({ email: 'a@example.com', name: 'A' });
      await request(app).post('/api/users').send({ email: 'b@example.com', name: 'B' });

      const res = await request(app).get('/api/users');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('GET /api/users/:id', () => {
    it('returns the user by id', async () => {
      const created = await request(app)
        .post('/api/users')
        .send({ email: 'c@example.com', name: 'C' });

      const res = await request(app).get(`/api/users/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app).get('/api/users/non-existent-id');
      expect(res.status).toBe(404);
    });
  });
});
