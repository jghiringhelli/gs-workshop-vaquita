import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import { runMigrations } from '../db/schema';
import { createApp } from '../app';

process.env.JWT_SECRET = 'test-secret';
const JWT_SECRET = 'test-secret';

function createTestDb() {
  const db = new Database(':memory:');
  runMigrations(db);
  return db;
}

function makeToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET);
}

async function createUser(app: any, email: string, name: string) {
  const res = await request(app).post('/api/users').send({ email, name });
  return res.body;
}

describe('Tandas API', () => {
  let db: Database.Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = createTestDb();
    app = createApp(db);
  });

  describe('POST /api/tandas', () => {
    it('creates a tanda and auto-joins organizer', async () => {
      const user = await createUser(app, 'alice@example.com', 'Alice');

      const res = await request(app).post('/api/tandas').send({
        name: 'Tanda Enero',
        organizerId: user.id,
        contributionAmount: 1000,
      });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Tanda Enero');
      expect(res.body.status).toBe('forming');
      expect(res.body.organizerId).toBe(user.id);
    });

    it('returns 400 for missing fields', async () => {
      const res = await request(app).post('/api/tandas').send({ name: 'Test' });
      expect(res.status).toBe(400);
    });

    it('returns 404 for unknown organizer', async () => {
      const res = await request(app).post('/api/tandas').send({
        name: 'Tanda',
        organizerId: 'nonexistent',
        contributionAmount: 1000,
      });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/tandas', () => {
    it('lists all tandas', async () => {
      const user = await createUser(app, 'alice@example.com', 'Alice');
      await request(app)
        .post('/api/tandas')
        .send({ name: 'T1', organizerId: user.id, contributionAmount: 500 });

      const res = await request(app).get('/api/tandas');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
    });

    it('filters tandas by userId', async () => {
      const user = await createUser(app, 'alice@example.com', 'Alice');
      const user2 = await createUser(app, 'bob@example.com', 'Bob');
      await request(app)
        .post('/api/tandas')
        .send({ name: 'T1', organizerId: user.id, contributionAmount: 500 });
      await request(app)
        .post('/api/tandas')
        .send({ name: 'T2', organizerId: user2.id, contributionAmount: 500 });

      const res = await request(app).get(`/api/tandas?userId=${user.id}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].organizerId).toBe(user.id);
    });
  });

  describe('GET /api/tandas/:id', () => {
    it('returns tanda by id', async () => {
      const user = await createUser(app, 'alice@example.com', 'Alice');
      const tanda = (
        await request(app)
          .post('/api/tandas')
          .send({ name: 'T1', organizerId: user.id, contributionAmount: 500 })
      ).body;

      const res = await request(app).get(`/api/tandas/${tanda.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(tanda.id);
    });

    it('returns 404 for unknown tanda', async () => {
      const res = await request(app).get('/api/tandas/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/tandas/:id/join', () => {
    it('joins a tanda successfully', async () => {
      const organizer = await createUser(app, 'alice@example.com', 'Alice');
      const member = await createUser(app, 'bob@example.com', 'Bob');
      const tanda = (
        await request(app)
          .post('/api/tandas')
          .send({ name: 'T1', organizerId: organizer.id, contributionAmount: 500 })
      ).body;

      const token = makeToken(member.id);
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/join`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: member.id });

      expect(res.status).toBe(201);
      expect(res.body.userId).toBe(member.id);
      expect(res.body.role).toBe('member');
    });

    it('returns 401 without token', async () => {
      const res = await request(app)
        .post('/api/tandas/some-id/join')
        .send({ userId: 'some-user' });
      expect(res.status).toBe(401);
    });

    it('returns 409 if already a participant', async () => {
      const organizer = await createUser(app, 'alice@example.com', 'Alice');
      const tanda = (
        await request(app)
          .post('/api/tandas')
          .send({ name: 'T1', organizerId: organizer.id, contributionAmount: 500 })
      ).body;

      const token = makeToken(organizer.id);
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/join`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: organizer.id });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/tandas/:id/start', () => {
    async function setupTandaWithParticipants(app: any, count: number) {
      const organizer = await createUser(app, 'organizer@example.com', 'Organizer');
      const tanda = (
        await request(app)
          .post('/api/tandas')
          .send({ name: 'T1', organizerId: organizer.id, contributionAmount: 500 })
      ).body;

      for (let i = 0; i < count - 1; i++) {
        const user = await createUser(app, `user${i}@example.com`, `User${i}`);
        const token = makeToken(user.id);
        await request(app)
          .post(`/api/tandas/${tanda.id}/join`)
          .set('Authorization', `Bearer ${token}`)
          .send({ userId: user.id });
      }

      return { organizer, tanda };
    }

    it('starts a tanda with enough participants', async () => {
      const { organizer, tanda } = await setupTandaWithParticipants(app, 3);
      const token = makeToken(organizer.id);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('active');
      expect(res.body.currentRound).toBe(1);
      expect(res.body.totalRounds).toBe(3);
    });

    it('returns 400 if fewer than 3 participants', async () => {
      const { organizer, tanda } = await setupTandaWithParticipants(app, 2);
      const token = makeToken(organizer.id);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });

    it('returns 403 if not organizer', async () => {
      const { tanda } = await setupTandaWithParticipants(app, 3);
      const impostor = await createUser(app, 'impostor@example.com', 'Impostor');
      const token = makeToken(impostor.id);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/tandas/:id/cancel', () => {
    it('cancels a tanda', async () => {
      const user = await createUser(app, 'alice@example.com', 'Alice');
      const tanda = (
        await request(app)
          .post('/api/tandas')
          .send({ name: 'T1', organizerId: user.id, contributionAmount: 500 })
      ).body;
      const token = makeToken(user.id);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
    });

    it('returns 403 if not organizer', async () => {
      const user = await createUser(app, 'alice@example.com', 'Alice');
      const tanda = (
        await request(app)
          .post('/api/tandas')
          .send({ name: 'T1', organizerId: user.id, contributionAmount: 500 })
      ).body;
      const other = await createUser(app, 'bob@example.com', 'Bob');
      const token = makeToken(other.id);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/tandas/:id/participants', () => {
    it('lists participants', async () => {
      const user = await createUser(app, 'alice@example.com', 'Alice');
      const tanda = (
        await request(app)
          .post('/api/tandas')
          .send({ name: 'T1', organizerId: user.id, contributionAmount: 500 })
      ).body;

      const res = await request(app).get(`/api/tandas/${tanda.id}/participants`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].role).toBe('organizer');
    });

    it('returns 404 for unknown tanda', async () => {
      const res = await request(app).get('/api/tandas/nonexistent/participants');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/tandas/:id/advance', () => {
    async function setupActiveTanda(app: any) {
      const organizer = await createUser(app, 'organizer@example.com', 'Organizer');
      const tanda = (
        await request(app)
          .post('/api/tandas')
          .send({ name: 'T1', organizerId: organizer.id, contributionAmount: 500 })
      ).body;

      for (let i = 0; i < 2; i++) {
        const user = await createUser(app, `user${i}@example.com`, `User${i}`);
        const token = makeToken(user.id);
        await request(app)
          .post(`/api/tandas/${tanda.id}/join`)
          .set('Authorization', `Bearer ${token}`)
          .send({ userId: user.id });
      }

      const orgToken = makeToken(organizer.id);
      await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .set('Authorization', `Bearer ${orgToken}`);

      return { organizer, tanda };
    }

    it('advances round', async () => {
      const { organizer, tanda } = await setupActiveTanda(app);
      const token = makeToken(organizer.id);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.currentRound).toBe(2);
    });

    it('completes tanda after last round', async () => {
      const { organizer, tanda } = await setupActiveTanda(app);
      const token = makeToken(organizer.id);

      // Advance twice (3 rounds total, starts at 1, two advances needed)
      await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .set('Authorization', `Bearer ${token}`);
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
    });

    it('returns 403 if not organizer', async () => {
      const { tanda } = await setupActiveTanda(app);
      const impostor = await createUser(app, 'impostor@example.com', 'Impostor');
      const token = makeToken(impostor.id);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
