import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { resetDatabase } from '../db/database';

async function createUser(email: string, name: string): Promise<{ id: number; token: string }> {
  const res = await request(app).post('/api/users').send({ email, name });
  return { id: res.body.id, token: res.body.token };
}

async function setupActiveTanda(): Promise<{
  tandaId: number;
  organizer: { id: number; token: string };
  members: { id: number; token: string }[];
  participantIds: number[];
}> {
  const organizer = await createUser('org@test.com', 'Organizer');
  const tandaRes = await request(app)
    .post('/api/tandas')
    .set('Authorization', `Bearer ${organizer.token}`)
    .send({ name: 'Active Tanda', contributionAmount: 1000, totalRounds: 3 });
  const tandaId = tandaRes.body.id;

  const m1 = await createUser('m1@test.com', 'M1');
  const m2 = await createUser('m2@test.com', 'M2');

  await request(app).post(`/api/tandas/${tandaId}/join`).set('Authorization', `Bearer ${m1.token}`);
  await request(app).post(`/api/tandas/${tandaId}/join`).set('Authorization', `Bearer ${m2.token}`);

  await request(app)
    .post(`/api/tandas/${tandaId}/start`)
    .set('Authorization', `Bearer ${organizer.token}`);

  const participantsRes = await request(app)
    .get(`/api/tandas/${tandaId}/participants`)
    .set('Authorization', `Bearer ${organizer.token}`);
  const participantIds = participantsRes.body.map((p: { id: number }) => p.id);

  return { tandaId, organizer, members: [m1, m2], participantIds };
}

describe('Contribution endpoints', () => {
  beforeEach(() => {
    resetDatabase();
  });

  describe('POST /api/tandas/:id/contributions', () => {
    it('should record a contribution for an active tanda', async () => {
      const { tandaId, organizer } = await setupActiveTanda();

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .set('Authorization', `Bearer ${organizer.token}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(1000);
      expect(res.body.status).toBe('paid');
      expect(res.body.round).toBe(1);
    });

    it('should return 400 for contribution to non-active tanda', async () => {
      const organizer = await createUser('org@test.com', 'Org');
      const tandaRes = await request(app)
        .post('/api/tandas')
        .set('Authorization', `Bearer ${organizer.token}`)
        .send({ name: 'Forming', contributionAmount: 500, totalRounds: 3 });

      const res = await request(app)
        .post(`/api/tandas/${tandaRes.body.id}/contributions`)
        .set('Authorization', `Bearer ${organizer.token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 409 for duplicate contribution in same round', async () => {
      const { tandaId, organizer } = await setupActiveTanda();

      await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .set('Authorization', `Bearer ${organizer.token}`)
        .send({});

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .set('Authorization', `Bearer ${organizer.token}`)
        .send({});

      expect(res.status).toBe(409);
    });

    it('should apply 5% late penalty', async () => {
      const { tandaId, organizer } = await setupActiveTanda();

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .set('Authorization', `Bearer ${organizer.token}`)
        .send({ status: 'late' });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('late');
      expect(res.body.amount).toBe(1050); // 1000 + 5% = 1050
    });
  });

  describe('POST /api/tandas/:id/advance', () => {
    it('should advance the round', async () => {
      const { tandaId, organizer } = await setupActiveTanda();

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/advance`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.status).toBe(200);
      expect(res.body.currentRound).toBe(2);
    });

    it('should return 403 for non-organizer', async () => {
      const { tandaId, members } = await setupActiveTanda();

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/advance`)
        .set('Authorization', `Bearer ${members[0].token}`);

      expect(res.status).toBe(403);
    });

    it('should auto-complete after last round', async () => {
      const { tandaId, organizer } = await setupActiveTanda();

      // Advance from round 1 -> 2
      await request(app)
        .post(`/api/tandas/${tandaId}/advance`)
        .set('Authorization', `Bearer ${organizer.token}`);

      // Advance from round 2 -> 3 (last round, totalRounds=3)
      const res = await request(app)
        .post(`/api/tandas/${tandaId}/advance`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
    });
  });

  describe('GET /api/tandas/:id/rounds/:round', () => {
    it('should return round summary with contributions', async () => {
      const { tandaId, organizer } = await setupActiveTanda();

      await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .set('Authorization', `Bearer ${organizer.token}`)
        .send({});

      const res = await request(app)
        .get(`/api/tandas/${tandaId}/rounds/1`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.status).toBe(200);
      expect(res.body.round).toBe(1);
      expect(Array.isArray(res.body.contributions)).toBe(true);
      expect(res.body.contributions).toHaveLength(1);
    });
  });

  describe('GET /api/tandas/:id/participants/:pid/history', () => {
    it('should return contribution history for a participant', async () => {
      const { tandaId, organizer, participantIds } = await setupActiveTanda();

      await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .set('Authorization', `Bearer ${organizer.token}`)
        .send({});

      // Find organizer's participant id
      const orgParticipant = participantIds[0];

      const res = await request(app)
        .get(`/api/tandas/${tandaId}/participants/${orgParticipant}/history`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 404 for nonexistent participant', async () => {
      const { tandaId, organizer } = await setupActiveTanda();

      const res = await request(app)
        .get(`/api/tandas/${tandaId}/participants/999/history`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.status).toBe(404);
    });

    it('should return empty array for participant with no contributions', async () => {
      const { tandaId, organizer, participantIds } = await setupActiveTanda();

      const res = await request(app)
        .get(`/api/tandas/${tandaId}/participants/${participantIds[1]}/history`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('POST /api/tandas/:id/advance — edge cases', () => {
    it('should return 400 when advancing a non-active tanda', async () => {
      const organizer = await createUser('org@test.com', 'Org');
      const tandaRes = await request(app)
        .post('/api/tandas')
        .set('Authorization', `Bearer ${organizer.token}`)
        .send({ name: 'Forming', contributionAmount: 500, totalRounds: 3 });

      const res = await request(app)
        .post(`/api/tandas/${tandaRes.body.id}/advance`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.status).toBe(400);
    });

    it('should return 400 when advancing a completed tanda', async () => {
      const { tandaId, organizer } = await setupActiveTanda();

      // Complete the tanda (totalRounds=3, advance twice: 1->2, 2->3=completed)
      await request(app).post(`/api/tandas/${tandaId}/advance`).set('Authorization', `Bearer ${organizer.token}`);
      await request(app).post(`/api/tandas/${tandaId}/advance`).set('Authorization', `Bearer ${organizer.token}`);

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/advance`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tandas/:id/rounds/:round — edge cases', () => {
    it('should return 400 for invalid round number (0)', async () => {
      const { tandaId, organizer } = await setupActiveTanda();

      const res = await request(app)
        .get(`/api/tandas/${tandaId}/rounds/0`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.status).toBe(400);
    });

    it('should return 400 for round exceeding totalRounds', async () => {
      const { tandaId, organizer } = await setupActiveTanda();

      const res = await request(app)
        .get(`/api/tandas/${tandaId}/rounds/99`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.status).toBe(400);
    });
  });

  describe('Contribution — non-participant', () => {
    it('should return 404 when non-participant tries to contribute', async () => {
      const { tandaId } = await setupActiveTanda();
      const outsider = await createUser('outsider@test.com', 'Outsider');

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .set('Authorization', `Bearer ${outsider.token}`)
        .send({});

      expect(res.status).toBe(404);
    });
  });
});
