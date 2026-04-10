import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import db from '../db';

beforeEach(() => {
  db.exec('DELETE FROM contributions');
  db.exec('DELETE FROM participants');
  db.exec('DELETE FROM tandas');
  db.exec('DELETE FROM users');
});

describe('POST /api/users', () => {
  it('should create a user and return 201', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'alice@example.com', name: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.email).toBe('alice@example.com');
    expect(res.body.name).toBe('Alice');
  });

  it('should return 400 for missing email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Alice' });

    expect(res.status).toBe(400);
  });

  it('should return 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'not-an-email', name: 'Alice' });

    expect(res.status).toBe(400);
  });

  it('should return 409 for duplicate email', async () => {
    await request(app)
      .post('/api/users')
      .send({ email: 'alice@example.com', name: 'Alice' });

    const res = await request(app)
      .post('/api/users')
      .send({ email: 'alice@example.com', name: 'Alice 2' });

    expect(res.status).toBe(409);
  });
});

describe('GET /api/users', () => {
  it('should return an empty array when no users', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('should return all users', async () => {
    await request(app).post('/api/users').send({ email: 'a@a.com', name: 'A' });
    await request(app).post('/api/users').send({ email: 'b@b.com', name: 'B' });

    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('GET /api/users/:id', () => {
  it('should return a user by ID', async () => {
    const created = await request(app)
      .post('/api/users')
      .send({ email: 'alice@example.com', name: 'Alice' });

    const res = await request(app).get(`/api/users/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('alice@example.com');
  });

  it('should return 404 for non-existent user', async () => {
    const res = await request(app).get('/api/users/9999');
    expect(res.status).toBe(404);
  });

  it('should return 400 for invalid ID', async () => {
    const res = await request(app).get('/api/users/abc');
    expect(res.status).toBe(400);
  });
});
