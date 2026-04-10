import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { closeDb } from '../db';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  closeDb();
});

describe('POST /api/users', () => {
  it('creates a user and returns 201', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'alice@example.com', name: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'alice@example.com', name: 'Alice' });
    expect(typeof res.body.id).toBe('number');
  });

  it('returns 409 when email is already registered', async () => {
    await request(app)
      .post('/api/users')
      .send({ email: 'bob@example.com', name: 'Bob' });

    const res = await request(app)
      .post('/api/users')
      .send({ email: 'bob@example.com', name: 'Bob Again' });

    expect(res.status).toBe(409);
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'not-an-email', name: 'Bad' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'noname@example.com' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/users', () => {
  it('returns an array of users', async () => {
    await request(app)
      .post('/api/users')
      .send({ email: 'list-user@example.com', name: 'List User' });

    const res = await request(app).get('/api/users');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('GET /api/users/:id', () => {
  it('returns the user when found', async () => {
    const created = await request(app)
      .post('/api/users')
      .send({ email: 'findme@example.com', name: 'Find Me' });

    const res = await request(app).get(`/api/users/${created.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: 'findme@example.com', name: 'Find Me' });
  });

  it('returns 404 for unknown user', async () => {
    const res = await request(app).get('/api/users/99999');
    expect(res.status).toBe(404);
  });

  it('returns 400 for non-numeric id', async () => {
    const res = await request(app).get('/api/users/abc');
    expect(res.status).toBe(400);
  });
});
