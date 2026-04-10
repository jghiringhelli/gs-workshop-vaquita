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

async function setupActiveTanda(app: any) {
  const organizer = await createUser(app, 'organizer@example.com', 'Organizer');
  const tanda = (
    await request(app).post('/api/tandas').send({
      name: 'T1',
      organizerId: organizer.id,
      contributionAmount: 500,
    })
  ).body;

  const members = [];
  for (let i = 0; i < 2; i++) {
    const user = await createUser(app, `member${i}@example.com`, `Member${i}`);
    const token = makeToken(user.id);
    const pRes = await request(app)
      .post(`/api/tandas/${tanda.id}/join`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: user.id });
    members.push({ user, participant: pRes.body });
  }

  const orgToken = makeToken(organizer.id);
  await request(app)
    .post(`/api/tandas/${tanda.id}/start`)
    .set('Authorization', `Bearer ${orgToken}`);

  // Refresh tanda
  const activeTanda = (await request(app).get(`/api/tandas/${tanda.id}`)).body;

  // Get all participants (organizer + members)
  const participantsRes = await request(app).get(`/api/tandas/${tanda.id}/participants`);
  const participants = participantsRes.body;

  return { organizer, orgToken, tanda: activeTanda, members, participants };
}

describe('Contributions API', () => {
  let db: Database.Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = createTestDb();
    app = createApp(db);
  });

  describe('POST /api/tandas/:id/contributions', () => {
    it('records a contribution successfully', async () => {
      const { orgToken, tanda, participants } = await setupActiveTanda(app);
      const participant = participants[0];

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ participantId: participant.id, amount: 500 });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('paid');
      expect(res.body.round).toBe(1);
    });

    it('records a late contribution with penalty', async () => {
      const { orgToken, tanda, participants } = await setupActiveTanda(app);
      const participant = participants[0];

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ participantId: participant.id, amount: 500, late: true });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('late');
      expect(res.body.amount).toBe(525); // 500 * 1.05
    });

    it('returns 409 for duplicate contribution in same round', async () => {
      const { orgToken, tanda, participants } = await setupActiveTanda(app);
      const participant = participants[0];

      await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ participantId: participant.id, amount: 500 });

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ participantId: participant.id, amount: 500 });

      expect(res.status).toBe(409);
    });

    it('returns 401 without token', async () => {
      const res = await request(app)
        .post('/api/tandas/some-id/contributions')
        .send({ participantId: 'p1', amount: 500 });
      expect(res.status).toBe(401);
    });

    it('returns 409 if tanda is not active', async () => {
      const user = await createUser(app, 'alice@example.com', 'Alice');
      const tanda = (
        await request(app).post('/api/tandas').send({
          name: 'T1',
          organizerId: user.id,
          contributionAmount: 500,
        })
      ).body;
      const token = makeToken(user.id);

      // Get the organizer participant
      const participantsRes = await request(app).get(`/api/tandas/${tanda.id}/participants`);
      const participant = participantsRes.body[0];

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ participantId: participant.id, amount: 500 });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/tandas/:id/rounds/:round', () => {
    it('returns round summary', async () => {
      const { orgToken, tanda, participants } = await setupActiveTanda(app);

      await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ participantId: participants[0].id, amount: 500 });

      const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/1`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
    });

    it('returns 404 for unknown tanda', async () => {
      const res = await request(app).get('/api/tandas/nonexistent/rounds/1');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/tandas/:id/participants/:pid/history', () => {
    it('returns participant contribution history', async () => {
      const { orgToken, tanda, participants } = await setupActiveTanda(app);
      const participant = participants[0];

      await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ participantId: participant.id, amount: 500 });

      const res = await request(app).get(
        `/api/tandas/${tanda.id}/participants/${participant.id}/history`,
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
    });

    it('returns 404 for unknown participant', async () => {
      const user = await createUser(app, 'alice@example.com', 'Alice');
      const tanda = (
        await request(app).post('/api/tandas').send({
          name: 'T1',
          organizerId: user.id,
          contributionAmount: 500,
        })
      ).body;

      const res = await request(app).get(
        `/api/tandas/${tanda.id}/participants/nonexistent/history`,
      );
      expect(res.status).toBe(404);
    });
  });
});
