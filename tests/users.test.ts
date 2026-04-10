import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { db } from '../src/db';

beforeEach(() => {
  db.exec(`
    DELETE FROM contributions;
    DELETE FROM participants;
    DELETE FROM tandas;
    DELETE FROM users;
  `);
});

describe('POST /api/users', () => {
  it('creates a user', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'alice@test.com', name: 'Alice' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'alice@test.com', name: 'Alice' });
    expect(res.body.id).toBeDefined();
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'not-an-email', name: 'Alice' });
    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate email', async () => {
    await request(app).post('/api/users').send({ email: 'alice@test.com', name: 'Alice' });
    const res = await request(app).post('/api/users').send({ email: 'alice@test.com', name: 'Alice2' });
    expect(res.status).toBe(409);
  });
});

describe('GET /api/users', () => {
  it('returns list of users', async () => {
    await request(app).post('/api/users').send({ email: 'a@test.com', name: 'A' });
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('GET /api/users/:id', () => {
  it('returns user by id', async () => {
    const created = await request(app).post('/api/users').send({ email: 'b@test.com', name: 'B' });
    const res = await request(app).get(`/api/users/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('b@test.com');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/users/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});
