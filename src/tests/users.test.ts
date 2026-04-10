import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../app';
import { closeDb } from '../db/database';

beforeEach(() => {
  closeDb();
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

  it('returns 409 for duplicate email', async () => {
    await request(app).post('/api/users').send({ email: 'bob@example.com', name: 'Bob' });
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'bob@example.com', name: 'Bob2' });
    expect(res.status).toBe(409);
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app).post('/api/users').send({ email: 'not-an-email', name: 'X' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing name', async () => {
    const res = await request(app).post('/api/users').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/users', () => {
  it('returns empty array initially', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns created users', async () => {
    await request(app).post('/api/users').send({ email: 'a@a.com', name: 'A' });
    await request(app).post('/api/users').send({ email: 'b@b.com', name: 'B' });
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('GET /api/users/:id', () => {
  it('returns a user by id', async () => {
    const created = await request(app)
      .post('/api/users')
      .send({ email: 'c@c.com', name: 'C' });
    const res = await request(app).get(`/api/users/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('C');
  });

  it('returns 404 for missing user', async () => {
    const res = await request(app).get('/api/users/9999');
    expect(res.status).toBe(404);
  });
});
