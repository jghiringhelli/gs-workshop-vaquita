import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { resetDb, closeDb } from './db/database';

const app = createApp();

beforeEach(() => {
  resetDb();
});

afterAll(() => {
  closeDb();
});

describe('Users API', () => {
  it('POST /api/users - creates a user', async () => {
    const res = await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.email).toBe('alice@example.com');
    expect(res.body.name).toBe('Alice');
  });

  it('POST /api/users - fails with duplicate email', async () => {
    await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice' });
    const res = await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice 2' });
    expect(res.status).toBe(409);
  });

  it('POST /api/users - validates email format', async () => {
    const res = await request(app).post('/api/users').send({ email: 'not-an-email', name: 'Alice' });
    expect(res.status).toBe(400);
  });

  it('GET /api/users - lists users', async () => {
    await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice' });
    await request(app).post('/api/users').send({ email: 'bob@example.com', name: 'Bob' });
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('GET /api/users/:id - gets user by id', async () => {
    const created = await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice' });
    const res = await request(app).get(`/api/users/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
  });

  it('GET /api/users/:id - returns 404 for unknown user', async () => {
    const res = await request(app).get('/api/users/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});
