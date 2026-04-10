import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/schema';
import { createApp } from '../app';

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  const db = new Database(':memory:');
  runMigrations(db);
  app = createApp(db);
});

describe('POST /api/users', () => {
  it('creates a user and returns 201', async () => {
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
      .send({ email: 'not-valid', name: 'Alice' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing name', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate email', async () => {
    await request(app).post('/api/users').send({ email: 'dup@example.com', name: 'Dup' });
    const res = await request(app).post('/api/users').send({ email: 'dup@example.com', name: 'Dup2' });
    expect(res.status).toBe(409);
  });
});

describe('GET /api/users', () => {
  it('returns an array', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/users/:id', () => {
  it('returns a user by id', async () => {
    const create = await request(app)
      .post('/api/users')
      .send({ email: 'bob@example.com', name: 'Bob' });
    const res = await request(app).get(`/api/users/${create.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('bob@example.com');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/users/999999');
    expect(res.status).toBe(404);
  });
});
