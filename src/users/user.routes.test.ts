import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { createDatabase } from '../db/database';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { createUserRouter } from './user.routes';
import type { Application } from 'express';

function buildTestApp(): Application {
  const db = createDatabase(':memory:');
  const repo = new UserRepository(db);
  const service = new UserService(repo);
  return createApp([{ path: '/api/users', router: createUserRouter(service) }]);
}

describe('POST /api/users', () => {
  let app: Application;

  beforeEach(() => {
    app = buildTestApp();
  });

  it('creates a user and returns 201 with the user DTO', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'alice@example.com', name: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      email: 'alice@example.com',
      name: 'Alice',
    });
    expect(typeof res.body.data.id).toBe('string');
    expect(typeof res.body.data.createdAt).toBe('string');
  });

  it('returns 422 when email is missing', async () => {
    const res = await request(app).post('/api/users').send({ name: 'Alice' });

    expect(res.status).toBe(422);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors[0].field).toBe('email');
  });

  it('returns 422 when email is malformed', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'not-an-email', name: 'Alice' });

    expect(res.status).toBe(422);
  });

  it('returns 422 when name is missing', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'alice@example.com' });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe('name');
  });

  it('returns 409 when the email is already registered', async () => {
    await request(app)
      .post('/api/users')
      .send({ email: 'alice@example.com', name: 'Alice' });

    const res = await request(app)
      .post('/api/users')
      .send({ email: 'alice@example.com', name: 'Alice Duplicate' });

    expect(res.status).toBe(409);
    expect(res.body.errors[0].code).toBe('CONFLICT');
  });

  it('does not expose unexpected fields in the response', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'alice@example.com', name: 'Alice' });

    const keys = Object.keys(res.body.data as Record<string, unknown>);
    expect(keys).toEqual(expect.arrayContaining(['id', 'email', 'name', 'createdAt']));
    expect(keys).not.toContain('passwordHash');
    expect(keys).not.toContain('created_at');
  });
});

describe('GET /api/users', () => {
  let app: Application;

  beforeEach(() => {
    app = buildTestApp();
  });

  it('returns 200 with an empty list when no users exist', async () => {
    const res = await request(app).get('/api/users');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  it('returns all created users with correct meta.total', async () => {
    await request(app).post('/api/users').send({ email: 'alice@example.com', name: 'Alice' });
    await request(app).post('/api/users').send({ email: 'bob@example.com', name: 'Bob' });

    const res = await request(app).get('/api/users');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(2);
  });
});

describe('GET /api/users/:id', () => {
  let app: Application;

  beforeEach(() => {
    app = buildTestApp();
  });

  it('returns 200 with the user when found', async () => {
    const created = await request(app)
      .post('/api/users')
      .send({ email: 'alice@example.com', name: 'Alice' });

    const { id } = created.body.data as { id: string };

    const res = await request(app).get(`/api/users/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
    expect(res.body.data.email).toBe('alice@example.com');
  });

  it('returns 404 with NOT_FOUND code when user does not exist', async () => {
    const res = await request(app).get('/api/users/00000000-0000-0000-0000-000000000000');

    expect(res.status).toBe(404);
    expect(res.body.errors[0].code).toBe('NOT_FOUND');
  });
});
