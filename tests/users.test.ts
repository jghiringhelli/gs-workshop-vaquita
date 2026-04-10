import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { createDatabase } from '../src/db/database';
import { SqliteUserRepository } from '../src/modules/users/SqliteUserRepository';
import { UserService } from '../src/modules/users/UserService';
import { SqliteTandaRepository } from '../src/modules/tandas/SqliteTandaRepository';
import { SqliteParticipantRepository } from '../src/modules/participants/SqliteParticipantRepository';
import { SqliteContributionRepository } from '../src/modules/contributions/SqliteContributionRepository';
import { TandaService } from '../src/modules/tandas/TandaService';

function buildApp() {
  const db = createDatabase(':memory:');
  const userRepo = new SqliteUserRepository(db);
  const tandaRepo = new SqliteTandaRepository(db);
  const participantRepo = new SqliteParticipantRepository(db);
  const contributionRepo = new SqliteContributionRepository(db);
  const userService = new UserService(userRepo);
  const tandaService = new TandaService(tandaRepo, participantRepo, contributionRepo, userRepo);
  return createApp({ userService, tandaService });
}

describe('Users API', () => {
  const app = buildApp();

  describe('POST /api/users', () => {
    it('creates a user and returns 201', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'alice@example.com', name: 'Alice' });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ email: 'alice@example.com', name: 'Alice' });
      expect(res.body.data.id).toBeDefined();
    });

    it('returns 409 for duplicate email', async () => {
      await request(app).post('/api/users').send({ email: 'dup@example.com', name: 'Dup' });
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'dup@example.com', name: 'Dup2' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('returns 422 for invalid email', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'not-an-email', name: 'Bob' });
      expect(res.status).toBe(422);
    });

    it('returns 422 for missing name', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'noname@example.com' });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/users', () => {
    it('returns 200 with list of users', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('includes previously created users', async () => {
      await request(app).post('/api/users').send({ email: 'list-test@example.com', name: 'ListTest' });
      const res = await request(app).get('/api/users');
      const emails = res.body.data.map((u: { email: string }) => u.email);
      expect(emails).toContain('list-test@example.com');
    });
  });

  describe('GET /api/users/:id', () => {
    let userId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'getbyid@example.com', name: 'GetById' });
      userId = res.body.data.id;
    });

    it('returns 200 with the user', async () => {
      const res = await request(app).get(`/api/users/${userId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(userId);
      expect(res.body.data.email).toBe('getbyid@example.com');
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app).get('/api/users/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
