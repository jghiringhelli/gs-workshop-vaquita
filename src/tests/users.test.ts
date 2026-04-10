import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { createTestDb, setDb } from '../db';

beforeEach(() => {
  setDb(createTestDb());
});

describe('POST /api/users/register', () => {
  it('creates a user and returns safe fields', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ email: 'alice@example.com', username: 'alice', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'alice@example.com', username: 'alice' });
    expect(res.body.id).toBeDefined();
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('returns 409 when email is already registered', async () => {
    await request(app)
      .post('/api/users/register')
      .send({ email: 'alice@example.com', username: 'alice', password: 'password123' });

    const res = await request(app)
      .post('/api/users/register')
      .send({ email: 'alice@example.com', username: 'alice2', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 for an invalid email', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ email: 'not-an-email', username: 'alice', password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ email: 'alice@example.com', username: 'alice', password: 'short' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/users/login', () => {
  const credentials = {
    email: 'bob@example.com',
    username: 'bob',
    password: 'secret1234',
  };

  beforeEach(async () => {
    await request(app).post('/api/users/register').send(credentials);
  });

  it('returns a JWT token for valid credentials', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ email: credentials.email, password: credentials.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({ email: 'bob@example.com', username: 'bob' });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('returns 401 for a wrong password', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ email: credentials.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for a non-existent user', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ email: 'nobody@example.com', password: 'abc12345' });

    expect(res.status).toBe(401);
  });
});
