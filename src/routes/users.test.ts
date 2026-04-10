import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { createDb, setDb } from '../db';

const app = createApp();

beforeAll(() => {
  setDb(createDb(':memory:'));
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
      .send({ email: 'not-an-email', name: 'Alice' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 409 for duplicate email', async () => {
    await request(app).post('/api/users').send({ email: 'dup@example.com', name: 'Dup' });
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'dup@example.com', name: 'Dup2' });

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
  it('returns the user when found', async () => {
    const created = await request(app)
      .post('/api/users')
      .send({ email: 'bob@example.com', name: 'Bob' });

    const res = await request(app).get(`/api/users/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Bob');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/users/does-not-exist');
    expect(res.status).toBe(404);
  });
});
