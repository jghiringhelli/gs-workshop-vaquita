process.env.NODE_ENV = 'test';

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { db } from '../db';

beforeEach(() => {
  db.exec('DELETE FROM contributions');
  db.exec('DELETE FROM participants');
  db.exec('DELETE FROM tandas');
  db.exec('DELETE FROM users');
});

describe('POST /api/users', () => {
  it('creates a user successfully', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'test@example.com', name: 'Test User' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'test@example.com', name: 'Test User' });
    expect(res.body.id).toBeDefined();
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'not-an-email', name: 'Test' });
    expect(res.status).toBe(400);
  });

  it('returns 409 if email already exists', async () => {
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
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/users/:id', () => {
  it('returns user by id', async () => {
    const created = await request(app).post('/api/users').send({ email: 'b@example.com', name: 'B' });
    const res = await request(app).get(`/api/users/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/users/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});
