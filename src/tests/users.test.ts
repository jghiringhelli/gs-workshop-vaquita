import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../index.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { TandaRepository } from '../repositories/TandaRepository.js';
import { ParticipantRepository } from '../repositories/ParticipantRepository.js';
import { ContributionRepository } from '../repositories/ContributionRepository.js';
import { UserService } from '../services/UserService.js';
import { TandaService } from '../services/TandaService.js';
import { getDatabase, closeDatabase } from '../db/database.js';
import { runMigrations } from '../db/schema.js';

let app: Express;

beforeEach(() => {
  process.env['DB_PATH'] = ':memory:';
  closeDatabase();
  const db = getDatabase();
  runMigrations();
  const userRepo = new UserRepository(db);
  const tandaRepo = new TandaRepository(db);
  const participantRepo = new ParticipantRepository(db);
  const contributionRepo = new ContributionRepository(db);
  const userService = new UserService(userRepo);
  const tandaService = new TandaService(tandaRepo, participantRepo, contributionRepo, userRepo);
  app = createApp(userService, tandaService);
});

afterEach(() => {
  closeDatabase();
});

describe('POST /api/users', () => {
  it('creates a user and returns 201', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'alice@example.com', name: 'Alice' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'alice@example.com', name: 'Alice' });
    expect(typeof res.body.id).toBe('string');
  });

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/users').send({ email: 'alice@example.com' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'not-an-email', name: 'Alice' });
    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate email', async () => {
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
  it('returns 200 with an array', async () => {
    await request(app).post('/api/users').send({ email: 'bob@example.com', name: 'Bob' });
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/users/:id', () => {
  it('returns 200 with the user', async () => {
    const create = await request(app)
      .post('/api/users')
      .send({ email: 'carol@example.com', name: 'Carol' });
    const { id } = create.body as { id: string };
    const res = await request(app).get(`/api/users/${id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id, name: 'Carol' });
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/users/nonexistent-id');
    expect(res.status).toBe(404);
  });
});
