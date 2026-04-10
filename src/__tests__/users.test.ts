import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app';
import { createDatabase, setDatabase, resetDatabase } from '../db/database';

let app: Express;

beforeEach(() => {
  setDatabase(createDatabase(':memory:'));
  app = createApp();
});

afterEach(() => {
  resetDatabase();
});

describe('POST /api/users', () => {
  it('creates a user and returns 201', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'alice@example.com', name: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'alice@example.com', name: 'Alice' });
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'not-valid', name: 'Alice' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for missing name', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'alice@example.com' });

    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate email', async () => {
    await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice' });
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'alice@example.com', name: 'Alice 2' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('CONFLICT');
  });
});

describe('GET /api/users', () => {
  it('returns empty array when no users', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all users', async () => {
    await request(app).post('/api/users').send({ email: 'a@test.com', name: 'A' });
    await request(app).post('/api/users').send({ email: 'b@test.com', name: 'B' });
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('GET /api/users/:id', () => {
  it('returns user by id', async () => {
    const created = await request(app)
      .post('/api/users')
      .send({ email: 'alice@example.com', name: 'Alice' });

    const res = await request(app).get(`/api/users/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('alice@example.com');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/users/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });
});
