import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestCtx, type TestCtx } from './helpers';

describe('/api/users', () => {
  let ctx: TestCtx;

  beforeEach(() => {
    ctx = createTestCtx();
  });

  // ── POST /api/users ───────────────────────────────────────────────────────

  describe('POST /api/users', () => {
    it('201 — creates a user', async () => {
      const res = await request(ctx.app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ email: 'alice@example.com', name: 'Alice' });
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('createdAt');
    });

    it('400 — missing name', async () => {
      const res = await request(ctx.app).post('/api/users').send({ email: 'x@x.com' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('400 — invalid email', async () => {
      const res = await request(ctx.app).post('/api/users').send({ email: 'bad', name: 'Bob' });
      expect(res.status).toBe(400);
    });

    it('409 — duplicate email', async () => {
      await request(ctx.app).post('/api/users').send({ email: 'dup@x.com', name: 'Dup' });
      const res = await request(ctx.app).post('/api/users').send({ email: 'dup@x.com', name: 'Dup2' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  // ── GET /api/users ────────────────────────────────────────────────────────

  describe('GET /api/users', () => {
    it('200 — returns empty list initially', async () => {
      const res = await request(ctx.app).get('/api/users');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('200 — returns created users', async () => {
      await request(ctx.app).post('/api/users').send({ email: 'a@x.com', name: 'A' });
      await request(ctx.app).post('/api/users').send({ email: 'b@x.com', name: 'B' });

      const res = await request(ctx.app).get('/api/users');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  // ── GET /api/users/:id ────────────────────────────────────────────────────

  describe('GET /api/users/:id', () => {
    it('200 — returns a single user', async () => {
      const created = await request(ctx.app)
        .post('/api/users')
        .send({ email: 'find@x.com', name: 'Find' });

      const res = await request(ctx.app).get(`/api/users/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('find@x.com');
    });

    it('404 — unknown id', async () => {
      const res = await request(ctx.app).get('/api/users/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
