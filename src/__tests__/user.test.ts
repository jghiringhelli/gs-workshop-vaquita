import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { resetDatabase } from '../db/database';

describe('User endpoints', () => {
  beforeEach(() => {
    resetDatabase();
  });

  describe('POST /api/users', () => {
    it('should create a user and return 201 with id, email, name, token', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('token');
      expect(res.body.email).toBe('alice@example.com');
      expect(res.body.name).toBe('Alice');
      expect(typeof res.body.id).toBe('number');
      expect(typeof res.body.token).toBe('string');
    });

    it('should return 400 when email is missing', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ name: 'No Email' });

      expect(res.status).toBe(400);
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'not-an-email', name: 'Test' });

      expect(res.status).toBe(400);
    });

    it('should return 409 for duplicate email', async () => {
      await request(app)
        .post('/api/users')
        .send({ email: 'dup@example.com', name: 'First' });

      const res = await request(app)
        .post('/api/users')
        .send({ email: 'dup@example.com', name: 'Second' });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/users', () => {
    it('should return an array of users', async () => {
      await request(app).post('/api/users').send({ email: 'a@test.com', name: 'A' });
      await request(app).post('/api/users').send({ email: 'b@test.com', name: 'B' });

      const res = await request(app).get('/api/users');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return a user by id', async () => {
      const created = await request(app)
        .post('/api/users')
        .send({ email: 'find@test.com', name: 'FindMe' });

      const res = await request(app).get(`/api/users/${created.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('find@test.com');
    });

    it('should return 404 for nonexistent user', async () => {
      const res = await request(app).get('/api/users/999');

      expect(res.status).toBe(404);
    });
  });
});
