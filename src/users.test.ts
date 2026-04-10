import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { createDatabase } from './db/database';

describe('Users API', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    const db = createDatabase(':memory:');
    app = createApp(db);
  });

  describe('POST /api/users', () => {
    it('creates a user and returns a JWT token', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice Smith' })
        .expect(201);
      expect(res.body.user.id).toBeTruthy();
      expect(res.body.user.email).toBe('alice@example.com');
      expect(res.body.user.name).toBe('Alice Smith');
      expect(res.body.token).toBeTruthy();
    });

    it('rejects invalid email', async () => {
      await request(app)
        .post('/api/users')
        .send({ email: 'not-an-email', name: 'Alice' })
        .expect(400);
    });

    it('rejects name with special characters', async () => {
      await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice@#!' })
        .expect(400);
    });

    it('rejects duplicate email', async () => {
      await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice Smith' }).expect(201);
      await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice Jones' }).expect(409);
    });

    it('accepts names with valid special chars (hyphen, apostrophe, period)', async () => {
      await request(app)
        .post('/api/users')
        .send({ email: 'obrien@example.com', name: "Mary O'Brien-St. Claire" })
        .expect(201);
    });
  });

  describe('GET /api/users', () => {
    it('returns empty array when no users', async () => {
      const res = await request(app).get('/api/users').expect(200);
      expect(res.body).toEqual([]);
    });

    it('returns all users', async () => {
      await request(app).post('/api/users').send({ email: 'a@example.com', name: 'Alice' });
      await request(app).post('/api/users').send({ email: 'b@example.com', name: 'Bob' });
      const res = await request(app).get('/api/users').expect(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('GET /api/users/:id', () => {
    it('returns user by id', async () => {
      const createRes = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' })
        .expect(201);
      const res = await request(app).get(`/api/users/${createRes.body.user.id}`).expect(200);
      expect(res.body.email).toBe('alice@example.com');
    });

    it('returns 404 for unknown id', async () => {
      await request(app).get('/api/users/00000000-0000-0000-0000-000000000000').expect(404);
    });
  });
});
