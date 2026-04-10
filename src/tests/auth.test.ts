import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestCtx, type TestCtx } from './helpers';

describe('POST /api/auth/token', () => {
  let ctx: TestCtx;

  beforeEach(() => {
    ctx = createTestCtx();
  });

  it('200 — returns a JWT when the user exists', async () => {
    await request(ctx.app).post('/api/users').send({ email: 'ada@example.com', name: 'Ada' });

    const res = await request(ctx.app).post('/api/auth/token').send({ email: 'ada@example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
  });

  it('404 — user not found', async () => {
    const res = await request(ctx.app)
      .post('/api/auth/token')
      .send({ email: 'ghost@example.com' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('400 — invalid email format', async () => {
    const res = await request(ctx.app).post('/api/auth/token').send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('400 — missing body', async () => {
    const res = await request(ctx.app).post('/api/auth/token').send({});

    expect(res.status).toBe(400);
  });
});
