import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { resetDatabase } from '../db/database';
import {
  createUser, setupActiveTanda, completeTanda, createFormingTanda,
  postContribution, advanceTanda,
} from './test-helpers';

describe('Contribution endpoints', () => {
  beforeEach(() => { resetDatabase(); });

  describe('POST /api/tandas/:id/contributions', () => {
    it('should record a contribution for an active tanda', async () => {
      const { tandaId, organizer } = await setupActiveTanda();
      const res = await postContribution(tandaId, organizer.token);
      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(1000);
      expect(res.body.status).toBe('paid');
      expect(res.body.round).toBe(1);
    });

    it('should return 400 for contribution to non-active tanda', async () => {
      const { tandaId, organizer } = await createFormingTanda();
      const res = await postContribution(tandaId, organizer.token);
      expect(res.status).toBe(400);
    });

    it('should return 409 for duplicate contribution', async () => {
      const { tandaId, organizer } = await setupActiveTanda();
      await postContribution(tandaId, organizer.token);
      expect((await postContribution(tandaId, organizer.token)).status).toBe(409);
    });

    it('should apply 5% late penalty', async () => {
      const { tandaId, organizer } = await setupActiveTanda();
      const res = await postContribution(tandaId, organizer.token, { status: 'late' });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('late');
      expect(res.body.amount).toBe(1050);
    });

    it('should return 404 when non-participant contributes', async () => {
      const { tandaId } = await setupActiveTanda();
      const outsider = await createUser('outsider@test.com', 'Outsider');
      expect((await postContribution(tandaId, outsider.token)).status).toBe(404);
    });

    it('should return 404 for nonexistent tanda', async () => {
      const user = await createUser('org@test.com', 'Org');
      expect((await postContribution(999, user.token)).status).toBe(404);
    });

    it('should accept explicit participantId in body', async () => {
      const { tandaId, organizer, participantIds } = await setupActiveTanda();
      const res = await postContribution(tandaId, organizer.token, { participantId: participantIds[0] });
      expect(res.status).toBe(201);
      expect(res.body.participantId).toBe(participantIds[0]);
    });
  });

  describe('POST /api/tandas/:id/advance', () => {
    it('should advance the round', async () => {
      const { tandaId, organizer } = await setupActiveTanda();
      const res = await request(app).post(`/api/tandas/${tandaId}/advance`).set('Authorization', `Bearer ${organizer.token}`);
      expect(res.status).toBe(200);
      expect(res.body.currentRound).toBe(2);
    });

    it('should return 403 for non-organizer', async () => {
      const { tandaId, members } = await setupActiveTanda();
      const res = await request(app).post(`/api/tandas/${tandaId}/advance`).set('Authorization', `Bearer ${members[0].token}`);
      expect(res.status).toBe(403);
    });

    it('should auto-complete after last round', async () => {
      const { tandaId, organizer } = await setupActiveTanda();
      await advanceTanda(tandaId, organizer.token);
      const res = await request(app).post(`/api/tandas/${tandaId}/advance`).set('Authorization', `Bearer ${organizer.token}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
    });

    it('should return 400 for non-active tanda', async () => {
      const { tandaId, organizer } = await createFormingTanda();
      const res = await request(app).post(`/api/tandas/${tandaId}/advance`).set('Authorization', `Bearer ${organizer.token}`);
      expect(res.status).toBe(400);
    });

    it('should return 400 for completed tanda', async () => {
      const { tandaId, organizer } = await setupActiveTanda();
      await completeTanda(tandaId, organizer.token, 2);
      const res = await request(app).post(`/api/tandas/${tandaId}/advance`).set('Authorization', `Bearer ${organizer.token}`);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tandas/:id/rounds/:round', () => {
    it('should return round summary', async () => {
      const { tandaId, organizer } = await setupActiveTanda();
      await postContribution(tandaId, organizer.token);
      const res = await request(app).get(`/api/tandas/${tandaId}/rounds/1`);
      expect(res.status).toBe(200);
      expect(res.body.round).toBe(1);
      expect(res.body.contributions).toHaveLength(1);
    });

    it('should return 400 for round 0', async () => {
      const { tandaId } = await setupActiveTanda();
      expect((await request(app).get(`/api/tandas/${tandaId}/rounds/0`)).status).toBe(400);
    });

    it('should return 400 for round > totalRounds', async () => {
      const { tandaId } = await setupActiveTanda();
      expect((await request(app).get(`/api/tandas/${tandaId}/rounds/99`)).status).toBe(400);
    });

    it('should return 404 for nonexistent tanda', async () => {
      expect((await request(app).get('/api/tandas/999/rounds/1')).status).toBe(404);
    });

    it('should return null recipient when no matching position', async () => {
      const { tandaId } = await setupActiveTanda(5);
      const res = await request(app).get(`/api/tandas/${tandaId}/rounds/5`);
      expect(res.status).toBe(200);
      expect(res.body.recipient).toBeNull();
    });
  });

  describe('GET /api/tandas/:id/participants/:pid/history', () => {
    it('should return contribution history', async () => {
      const { tandaId, organizer, participantIds } = await setupActiveTanda();
      await postContribution(tandaId, organizer.token);
      const res = await request(app).get(`/api/tandas/${tandaId}/participants/${participantIds[0]}/history`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 404 for nonexistent participant', async () => {
      const { tandaId } = await setupActiveTanda();
      expect((await request(app).get(`/api/tandas/${tandaId}/participants/999/history`)).status).toBe(404);
    });

    it('should return empty array with no contributions', async () => {
      const { tandaId, participantIds } = await setupActiveTanda();
      const res = await request(app).get(`/api/tandas/${tandaId}/participants/${participantIds[1]}/history`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return 404 for nonexistent tanda', async () => {
      expect((await request(app).get('/api/tandas/999/participants/1/history')).status).toBe(404);
    });
  });

  describe('Defaulter logic', () => {
    it('should flag after 2 consecutive missed contributions', async () => {
      const { tandaId, organizer, members } = await setupActiveTanda(5);
      for (let round = 1; round <= 3; round++) {
        await postContribution(tandaId, members[0].token, { status: 'missed' });
        if (round < 3) await advanceTanda(tandaId, organizer.token);
      }
      const parts = await request(app).get(`/api/tandas/${tandaId}/participants`);
      expect(parts.body.length).toBe(3);
    });
  });
});
