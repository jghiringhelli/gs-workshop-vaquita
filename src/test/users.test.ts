import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { clearAllTables } from '../db';
import { createUserAndToken } from './helpers';

beforeEach(() => {
  clearAllTables();
});

describe('POST /api/users', () => {
  it('creates a user and returns user object with token', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'alice@example.com', name: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      user: { email: 'alice@example.com', name: 'Alice' },
    });
    expect(typeof res.body.user.id).toBe('string');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);
  });

  it('returns 409 when email is already registered', async () => {
    await request(app).post('/api/users').send({ email: 'dup@example.com', name: 'First' });
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'dup@example.com', name: 'Second' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns 422 when email is invalid', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'not-an-email', name: 'Bob' });

    expect(res.status).toBe(422);
  });

  it('returns 422 when name is empty', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'valid@example.com', name: '' });

    expect(res.status).toBe(422);
  });
});

describe('GET /api/users', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('returns list of users with valid token', async () => {
    const { token } = await createUserAndToken({ email: 'list@example.com', name: 'ListUser' });
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/users/:id', () => {
  it('returns user by ID', async () => {
    const { user, token } = await createUserAndToken({
      email: 'getbyid@example.com',
      name: 'GetById',
    });

    const res = await request(app)
      .get(`/api/users/${user.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, email: 'getbyid@example.com' });
  });

  it('returns 404 for a non-existent user', async () => {
    const { token } = await createUserAndToken();
    const res = await request(app)
      .get('/api/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns 422 for an invalid UUID', async () => {
    const { token } = await createUserAndToken();
    const res = await request(app)
      .get('/api/users/not-a-uuid')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(422);
  });
});
