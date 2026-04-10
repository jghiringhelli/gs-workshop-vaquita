import { expect } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app';
import { createDb } from '../db/db';

export interface TestCtx {
  app: Express;
}

/** Each test suite should call this to get an isolated in-memory app. */
export function createTestCtx(): TestCtx {
  const db = createDb(':memory:');
  const app = createApp(db);
  return { app };
}

/** Helper: create a user and immediately obtain a JWT token. */
export async function createUserWithToken(
  app: Express,
  email = 'alice@example.com',
  name = 'Alice',
): Promise<{ userId: string; token: string; email: string }> {
  const userRes = await request(app).post('/api/users').send({ email, name });
  expect(userRes.status).toBe(201);

  const tokenRes = await request(app).post('/api/auth/token').send({ email });
  expect(tokenRes.status).toBe(200);

  return { userId: userRes.body.id as string, token: tokenRes.body.token as string, email };
}

export function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}
