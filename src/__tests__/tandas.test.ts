import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { resetDb } from '../db';

async function createUser(email: string, name: string) {
  const res = await request(app).post('/api/users').send({ email, name });
  return res.body;
}

async function createTanda(organizerId: number, name = 'Tanda Test', amount = 1000) {
  const res = await request(app)
    .post('/api/tandas')
    .send({ name, organizerId, contributionAmount: amount });
  return res.body;
}

async function setupActiveTanda() {
  const org = await createUser('org@test.com', 'Org');
  const m1 = await createUser('m1@test.com', 'M1');
  const m2 = await createUser('m2@test.com', 'M2');
  const tanda = await createTanda(org.id);

  await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m1.id });
  await request(app).post(`/api/tandas/${tanda.id}/join`).send({ userId: m2.id });
  await request(app).post(`/api/tandas/${tanda.id}/start`).send({ userId: org.id });

  const updated = await request(app).get(`/api/tandas/${tanda.id}`);
  const parts = await request(app).get(`/api/tandas/${tanda.id}/participants`);

  return { org, m1, m2, tanda: updated.body, participants: parts.body };
}

describe('Tandas API', () => {
  beforeEach(() => {
    resetDb();
  });

  describe('POST /api/tandas', () => {
    it('should create a tanda', async () => {
      const user = await createUser('org@test.com', 'Org');
      const res = await request(app)
        .post('/api/tandas')
        .send({ name: 'Tanda 1', organizerId: user.id, contributionAmount: 500 });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Tanda 1');
      expect(res.body.status).toBe('forming');
    });

    it('should return 404 for non-existent organizer', async () => {
      const res = await request(app)
        .post('/api/tandas')
        .send({ name: 'Tanda 1', organizerId: 9999, contributionAmount: 500 });

      expect(res.status).toBe(404);
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/tandas')
        .send({ name: 'Tanda 1' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tandas', () => {
    it('should list all tandas', async () => {
      const user = await createUser('org@test.com', 'Org');
      await createTanda(user.id);

      const res = await request(app).get('/api/tandas');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should filter tandas by userId', async () => {
      const user = await createUser('org@test.com', 'Org');
      await createTanda(user.id);

      const res = await request(app).get(`/api/tandas?userId=${user.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('GET /api/tandas/:id', () => {
    it('should get tanda by id', async () => {
      const user = await createUser('org@test.com', 'Org');
      const tanda = await createTanda(user.id);

      const res = await request(app).get(`/api/tandas/${tanda.id}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Tanda Test');
    });

    it('should return 404 for unknown tanda', async () => {
      const res = await request(app).get('/api/tandas/9999');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/tandas/:id/join', () => {
    it('should allow a user to join', async () => {
      const org = await createUser('org@test.com', 'Org');
      const member = await createUser('member@test.com', 'Member');
      const tanda = await createTanda(org.id);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/join`)
        .send({ userId: member.id });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('member');
    });

    it('should prevent duplicate join', async () => {
      const org = await createUser('org@test.com', 'Org');
      const tanda = await createTanda(org.id);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/join`)
        .send({ userId: org.id });

      expect(res.status).toBe(409);
    });

    it('should return 404 for unknown tanda', async () => {
      const user = await createUser('u@test.com', 'U');
      const res = await request(app)
        .post('/api/tandas/9999/join')
        .send({ userId: user.id });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/tandas/:id/start', () => {
    it('should start a tanda with enough participants', async () => {
      const { tanda } = await setupActiveTanda();

      expect(tanda.status).toBe('active');
      expect(tanda.currentRound).toBe(1);
      expect(tanda.totalRounds).toBe(3);
    });

    it('should fail with fewer than 3 participants', async () => {
      const org = await createUser('org@test.com', 'Org');
      const tanda = await createTanda(org.id);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .send({ userId: org.id });

      expect(res.status).toBe(400);
    });

    it('should fail if not organizer', async () => {
      const org = await createUser('org@test.com', 'Org');
      const m1 = await createUser('m1@test.com', 'M1');
      const tanda = await createTanda(org.id);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/start`)
        .send({ userId: m1.id });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/tandas/:id/cancel', () => {
    it('should cancel a tanda', async () => {
      const org = await createUser('org@test.com', 'Org');
      const tanda = await createTanda(org.id);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/cancel`)
        .send({ userId: org.id });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
    });

    it('should fail if not organizer', async () => {
      const org = await createUser('org@test.com', 'Org');
      const other = await createUser('other@test.com', 'Other');
      const tanda = await createTanda(org.id);

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/cancel`)
        .send({ userId: other.id });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/tandas/:id/participants', () => {
    it('should list participants', async () => {
      const org = await createUser('org@test.com', 'Org');
      const tanda = await createTanda(org.id);

      const res = await request(app).get(`/api/tandas/${tanda.id}/participants`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].role).toBe('organizer');
    });

    it('should return 404 for unknown tanda', async () => {
      const res = await request(app).get('/api/tandas/9999/participants');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/tandas/:id/contributions', () => {
    it('should record a contribution', async () => {
      const { tanda, participants } = await setupActiveTanda();
      const participant = participants[0];

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .send({ participantId: participant.id, amount: 1000 });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('paid');
    });

    it('should prevent duplicate contribution in same round', async () => {
      const { tanda, participants } = await setupActiveTanda();
      const participant = participants[0];

      await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .send({ participantId: participant.id, amount: 1000 });

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .send({ participantId: participant.id, amount: 1000 });

      expect(res.status).toBe(409);
    });

    it('should reject insufficient amount', async () => {
      const { tanda, participants } = await setupActiveTanda();
      const participant = participants[0];

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .send({ participantId: participant.id, amount: 100 });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tandas/:id/rounds/:round', () => {
    it('should get round summary', async () => {
      const { tanda } = await setupActiveTanda();

      const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/1`);
      expect(res.status).toBe(200);
      expect(res.body.round).toBe(1);
      expect(res.body.contributions).toBeDefined();
    });

    it('should return 400 for invalid round', async () => {
      const { tanda } = await setupActiveTanda();

      const res = await request(app).get(`/api/tandas/${tanda.id}/rounds/99`);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/tandas/:id/advance', () => {
    it('should advance to next round', async () => {
      const { org, tanda } = await setupActiveTanda();

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .send({ userId: org.id });

      expect(res.status).toBe(200);
      expect(res.body.currentRound).toBe(2);
    });

    it('should auto-complete after last round', async () => {
      const { org, tanda } = await setupActiveTanda();

      // Advance through all rounds (3 participants = 3 rounds)
      await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ userId: org.id }); // round 2
      await request(app).post(`/api/tandas/${tanda.id}/advance`).send({ userId: org.id }); // round 3

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .send({ userId: org.id });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
    });

    it('should fail if not organizer', async () => {
      const { m1, tanda } = await setupActiveTanda();

      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/advance`)
        .send({ userId: m1.id });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/tandas/:id/participants/:pid/history', () => {
    it('should get contribution history', async () => {
      const { tanda, participants } = await setupActiveTanda();
      const participant = participants[0];

      await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .send({ participantId: participant.id, amount: 1000 });

      const res = await request(app)
        .get(`/api/tandas/${tanda.id}/participants/${participant.id}/history`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should return 404 for unknown participant', async () => {
      const { tanda } = await setupActiveTanda();

      const res = await request(app)
        .get(`/api/tandas/${tanda.id}/participants/9999/history`);

      expect(res.status).toBe(404);
    });
  });
});
