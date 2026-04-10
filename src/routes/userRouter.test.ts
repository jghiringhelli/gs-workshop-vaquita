import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../index';
import { resetDb } from '../test/helpers';

beforeEach(resetDb);

// ─── POST /api/users/register ─────────────────────────────────────────────────

describe('POST /api/users/register', () => {
  it('creates a user and returns safe fields (no passwordHash)', async () => {
    const res = await request(app).post('/api/users/register').send({
      email: 'alice@example.com',
      username: 'Alice',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'alice@example.com', name: 'Alice' });
    expect(res.body).toHaveProperty('id');
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('returns 409 when email is already registered', async () => {
    await request(app).post('/api/users/register').send({
      email: 'alice@example.com',
      username: 'Alice',
      password: 'password123',
    });

    const res = await request(app).post('/api/users/register').send({
      email: 'alice@example.com',
      username: 'Alice2',
      password: 'differentpass',
    });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
  });

  it('returns 400 for an invalid email address', async () => {
    const res = await request(app).post('/api/users/register').send({
      email: 'not-an-email',
      username: 'Alice',
      password: 'password123',
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when password is shorter than 8 characters', async () => {
    const res = await request(app).post('/api/users/register').send({
      email: 'alice@example.com',
      username: 'Alice',
      password: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/users/register').send({
      email: 'alice@example.com',
    });

    expect(res.status).toBe(400);
  });
});

// ─── POST /api/users/login ────────────────────────────────────────────────────

describe('POST /api/users/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/users/register').send({
      email: 'alice@example.com',
      username: 'Alice',
      password: 'password123',
    });
  });

  it('returns a JWT token and user (without passwordHash) on valid credentials', async () => {
    const res = await request(app).post('/api/users/login').send({
      email: 'alice@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.split('.').length).toBe(3); // valid JWT shape
    expect(res.body.user).toMatchObject({ email: 'alice@example.com', name: 'Alice' });
    expect(res.body.user?.passwordHash).toBeUndefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app).post('/api/users/login').send({
      email: 'alice@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 for a non-existent email', async () => {
    const res = await request(app).post('/api/users/login').send({
      email: 'nobody@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for an invalid email format', async () => {
    const res = await request(app).post('/api/users/login').send({
      email: 'not-valid',
      password: 'password123',
    });

    expect(res.status).toBe(400);
  });
});
