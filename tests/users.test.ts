import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { clearAllTables } from '../src/infrastructure/database';

describe('Users API', () => {
  beforeEach(() => clearAllTables());

  it('POST /api/users — creates a user', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'alice@example.com', name: 'Alice' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.email).toBe('alice@example.com');
    expect(res.body.name).toBe('Alice');
    expect(res.body.createdAt).toBeDefined();
  });

  it('POST /api/users — returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'not-an-email', name: 'Bob' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/users — returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'bob@example.com' });
    expect(res.status).toBe(400);
  });

  it('POST /api/users — returns 409 for duplicate email', async () => {
    await request(app)
      .post('/api/users')
      .send({ email: 'dup@example.com', name: 'First' });
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'dup@example.com', name: 'Second' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('GET /api/users — returns all users', async () => {
    await request(app).post('/api/users').send({ email: 'a@example.com', name: 'A' });
    await request(app).post('/api/users').send({ email: 'b@example.com', name: 'B' });
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('GET /api/users — returns empty array when no users exist', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('GET /api/users/:id — returns user by ID', async () => {
    const created = await request(app)
      .post('/api/users')
      .send({ email: 'charlie@example.com', name: 'Charlie' });
    const res = await request(app).get(`/api/users/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('charlie@example.com');
  });

  it('GET /api/users/:id — returns 404 for unknown user', async () => {
    const res = await request(app).get('/api/users/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
