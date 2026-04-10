import { beforeEach, describe, it, expect } from 'vitest';

process.env.DATABASE_PATH = ':memory:';

import request from 'supertest';
import { app } from '../index';
import { resetDatabase } from '../db/database';

beforeEach(() => {
  resetDatabase();
});

describe('POST /api/users', () => {
  it('creates a user', async () => {
    const res = await request(app).post('/api/users').send({ email: 'test@example.com', name: 'Test User' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'test@example.com', name: 'Test User' });
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app).post('/api/users').send({ email: 'not-an-email', name: 'Test' });
    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate email', async () => {
    await request(app).post('/api/users').send({ email: 'dup@example.com', name: 'User 1' });
    const res = await request(app).post('/api/users').send({ email: 'dup@example.com', name: 'User 2' });
    expect(res.status).toBe(409);
  });
});

describe('GET /api/users', () => {
  it('returns list of users', async () => {
    await request(app).post('/api/users').send({ email: 'a@example.com', name: 'A' });
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/users/:id', () => {
  it('returns user by id', async () => {
    const created = await request(app).post('/api/users').send({ email: 'b@example.com', name: 'B' });
    const res = await request(app).get(`/api/users/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('b@example.com');
  });

  it('returns 404 for missing user', async () => {
    const res = await request(app).get('/api/users/9999');
    expect(res.status).toBe(404);
  });
});
