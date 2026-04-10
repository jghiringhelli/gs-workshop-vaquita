import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { createDatabase } from '../db/database';

function makeApp() {
  return createApp(createDatabase(':memory:'));
}

describe('POST /api/users', () => {
  it('creates a user and returns 201', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email: 'alice@example.com', name: 'Alice' });
    expect(res.body.data.id).toBeDefined();
  });

  it('returns 409 when email already exists', async () => {
    const app = makeApp();
    await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice' });
    const res = await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice 2' });
    expect(res.status).toBe(409);
  });

  it('returns 422 when email is invalid', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/users').send({ email: 'not-an-email', name: 'Bob' });
    expect(res.status).toBe(422);
  });

  it('returns 422 when name is missing', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/users').send({ email: 'bob@example.com' });
    expect(res.status).toBe(422);
  });
});

describe('GET /api/users', () => {
  it('returns empty array when no users', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns created users', async () => {
    const app = makeApp();
    await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice' });
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].email).toBe('alice@example.com');
  });
});

describe('GET /api/users/:id', () => {
  it('returns user by id', async () => {
    const app = makeApp();
    const created = await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice' });
    const id = created.body.data.id as string;
    const res = await request(app).get(`/api/users/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
  });

  it('returns 404 for unknown id', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/users/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});
