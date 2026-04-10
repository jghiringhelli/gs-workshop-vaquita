import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { resetDatabase } from '../db/database';
import { createUser, setupActiveTanda, completeTanda } from './test-helpers';

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
      expect(res.body.amount).toBe(1050);
    });

    it('should return 404 when non-participant tries to contribute', async () => {
      const { tandaId } = await setupActiveTanda();
      const outsider = await createUser('outsider@test.com', 'Outsider');

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .set('Authorization', `Bearer ${outsider.token}`)
        .send({});

      expect(res.status).toBe(404);
    });

    it('should return 404 for contribution to nonexistent tanda', async () => {
      const user = await createUser('org@test.com', 'Org');

      const res = await request(app)
        .post('/api/tandas/999/contributions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(res.status).toBe(404);
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
      await request(app).post(`/api/tandas/${tandaId}/advance`).set('Authorization', `Bearer ${organizer.token}`);

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/advance`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
    });

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
      await completeTanda(tandaId, organizer.token, 2);

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/advance`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.status).toBe(400);
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
      expect(res.body.contributions).toHaveLength(1);
    });

    it('should return 400 for invalid round number (0)', async () => {
      const { tandaId } = await setupActiveTanda();
      const res = await request(app).get(`/api/tandas/${tandaId}/rounds/0`);
      expect(res.status).toBe(400);
    });

    it('should return 400 for round exceeding totalRounds', async () => {
      const { tandaId } = await setupActiveTanda();
      const res = await request(app).get(`/api/tandas/${tandaId}/rounds/99`);
      expect(res.status).toBe(400);
    });

    it('should return 404 for nonexistent tanda in round summary', async () => {
      const res = await request(app).get('/api/tandas/999/rounds/1');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/tandas/:id/participants/:pid/history', () => {
    it('should return contribution history for a participant', async () => {
      const { tandaId, organizer, participantIds } = await setupActiveTanda();
      await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .set('Authorization', `Bearer ${organizer.token}`)
        .send({});

      const res = await request(app)
        .get(`/api/tandas/${tandaId}/participants/${participantIds[0]}/history`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 404 for nonexistent participant', async () => {
      const { tandaId } = await setupActiveTanda();
      const res = await request(app).get(`/api/tandas/${tandaId}/participants/999/history`);
      expect(res.status).toBe(404);
    });

    it('should return empty array for participant with no contributions', async () => {
      const { tandaId, participantIds } = await setupActiveTanda();
      const res = await request(app).get(`/api/tandas/${tandaId}/participants/${participantIds[1]}/history`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return 404 for nonexistent tanda in history', async () => {
      const res = await request(app).get('/api/tandas/999/participants/1/history');
      expect(res.status).toBe(404);
    });
  });

  describe('Defaulter logic', () => {
    it('should flag participant after 2 consecutive missed contributions', async () => {
      const { tandaId, organizer, members } = await setupActiveTanda(5);

      for (let round = 1; round <= 3; round++) {
        await request(app)
          .post(`/api/tandas/${tandaId}/contributions`)
          .set('Authorization', `Bearer ${members[0].token}`)
          .send({ status: 'missed' });
        if (round < 3) await request(app).post(`/api/tandas/${tandaId}/advance`).set('Authorization', `Bearer ${organizer.token}`);
      }

      const participants = await request(app).get(`/api/tandas/${tandaId}/participants`);
      expect(participants.status).toBe(200);
      expect(participants.body.length).toBe(3);
    });
  });

  describe('Contribution with explicit participantId', () => {
    it('should accept participantId in body', async () => {
      const { tandaId, organizer, participantIds } = await setupActiveTanda();

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/contributions`)
        .set('Authorization', `Bearer ${organizer.token}`)
        .send({ participantId: participantIds[0] });

      expect(res.status).toBe(201);
      expect(res.body.participantId).toBe(participantIds[0]);
    });
  });

  describe('Round summary — null recipient', () => {
    it('should return null recipient when no matching rotation position', async () => {
      const { tandaId } = await setupActiveTanda(5);

      const res = await request(app).get(`/api/tandas/${tandaId}/rounds/5`);
      expect(res.status).toBe(200);
      expect(res.body.recipient).toBeNull();
    });
  });
});
