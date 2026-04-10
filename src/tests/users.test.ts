import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../app';
import { createDatabase } from '../db';
import type { Express } from 'express';

describe('Users API', () => {
  let app: Express;

  beforeEach(() => {
    const db = createDatabase(':memory:');
    app = createApp(db);
  });

  describe('POST /api/users', () => {
    it('creates a user', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' });
      expect(res.status).toBe(201);
      expect(res.body.email).toBe('alice@example.com');
      expect(res.body.name).toBe('Alice');
      expect(res.body.id).toBeDefined();
    });

    it('returns 400 for missing email', async () => {
      const res = await request(app).post('/api/users').send({ name: 'No Email' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid email', async () => {
      const res = await request(app).post('/api/users').send({ email: 'not-valid', name: 'Alice' });
      expect(res.status).toBe(400);
    });

    it('returns 409 for duplicate email', async () => {
      await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice' });
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice2' });
      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/users', () => {
    it('returns empty list', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns list of users', async () => {
      await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice' });
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('GET /api/users/:id', () => {
    it('returns a user', async () => {
      const create = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' });
      const res = await request(app).get(`/api/users/${create.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('alice@example.com');
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app).get('/api/users/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns JWT token for valid user', async () => {
      await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice' });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@example.com' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('alice@example.com');
    });

    it('returns 404 for unknown email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com' });
      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'notanemail' });
      expect(res.status).toBe(400);
    });
  });
});
