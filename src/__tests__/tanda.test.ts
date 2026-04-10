import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { resetDatabase } from '../db/database';
import {
  createUser, createTandaWithOrganizer, createTandaWith3Members,
  completeTanda, startTanda, cancelTanda, joinTanda,
} from './test-helpers';

describe('Tanda endpoints', () => {
  beforeEach(() => { resetDatabase(); });

  describe('POST /api/tandas', () => {
    it('should create a tanda with correct shape', async () => {
      const user = await createUser('org@test.com', 'Org');
      const res = await request(app)
        .post('/api/tandas')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'Mi Tanda', contributionAmount: 500, totalRounds: 4 });

      expect(res.status).toBe(201);
      expect(typeof res.body.id).toBe('number');
      expect(res.body.name).toBe('Mi Tanda');
      expect(res.body.status).toBe('forming');
      expect(typeof res.body.contributionAmount).toBe('number');
      expect(typeof res.body.currentRound).toBe('number');
    });

    it('should auto-join the organizer as a participant', async () => {
      const { tanda } = await createTandaWithOrganizer();
      const res = await request(app).get(`/api/tandas/${tanda.id}/participants`);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].role).toBe('organizer');
    });

    it('should support organizerId in body without token', async () => {
      const user = await createUser('body@test.com', 'BodyUser');
      const res = await request(app)
        .post('/api/tandas')
        .send({ name: 'No Token', contributionAmount: 200, organizerId: user.id });
      expect(res.status).toBe(201);
    });

    it('should create a tanda without totalRounds', async () => {
      const user = await createUser('org@test.com', 'Org');
      const res = await request(app)
        .post('/api/tandas')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'No Rounds', contributionAmount: 500 });
      expect(res.status).toBe(201);
      expect(typeof res.body.totalRounds).toBe('number');
    });
  });

  describe('GET /api/tandas/:id', () => {
    it('should return tanda with participants array', async () => {
      const { tanda } = await createTandaWithOrganizer();
      const res = await request(app).get(`/api/tandas/${tanda.id}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.id).toBe('number');
      expect(Array.isArray(res.body.participants)).toBe(true);
    });

    it('should return 404 for nonexistent tanda', async () => {
      const res = await request(app).get('/api/tandas/999');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/tandas', () => {
    it('should filter by userId', async () => {
      const { organizer } = await createTandaWithOrganizer();
      const other = await createUser('other@test.com', 'Other');
      expect((await request(app).get(`/api/tandas?userId=${organizer.id}`)).body).toHaveLength(1);
      expect((await request(app).get(`/api/tandas?userId=${other.id}`)).body).toHaveLength(0);
    });

    it('should return all tandas without filter', async () => {
      await createTandaWithOrganizer();
      const res = await request(app).get('/api/tandas');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /api/tandas/:id/join', () => {
    it('should allow joining a forming tanda', async () => {
      const { tanda } = await createTandaWithOrganizer();
      const member = await createUser('m@test.com', 'M');
      const res = await joinTanda(tanda.id, member.token);
      expect(res.status).toBe(200);
      expect(res.body.role).toBe('member');
    });

    it('should return 409 for duplicate join', async () => {
      const { tanda } = await createTandaWithOrganizer();
      const member = await createUser('m@test.com', 'M');
      await joinTanda(tanda.id, member.token);
      expect((await joinTanda(tanda.id, member.token)).status).toBe(409);
    });

    it('should return 400 for joining a non-forming tanda', async () => {
      const { tandaId, organizer } = await createTandaWith3Members();
      await startTanda(tandaId, organizer.token);
      const late = await createUser('late@test.com', 'Late');
      expect((await joinTanda(tandaId, late.token)).status).toBe(400);
    });

    it('should return 400 when joining a cancelled tanda', async () => {
      const { tanda, organizer } = await createTandaWithOrganizer();
      await cancelTanda(tanda.id, organizer.token);
      const member = await createUser('m@test.com', 'M');
      expect((await joinTanda(tanda.id, member.token)).status).toBe(400);
    });

    it('should reject join at max capacity', async () => {
      const organizer = await createUser('org@test.com', 'Org');
      const tandaRes = await request(app)
        .post('/api/tandas')
        .set('Authorization', `Bearer ${organizer.token}`)
        .send({ name: 'Full', contributionAmount: 100, totalRounds: 3 });

      for (let i = 1; i <= 19; i++) {
        const m = await createUser(`f${i}@test.com`, `F${i}`);
        await joinTanda(tandaRes.body.id, m.token);
      }
      const extra = await createUser('extra@test.com', 'Extra');
      expect((await joinTanda(tandaRes.body.id, extra.token)).status).toBe(400);
    });
  });

  describe('POST /api/tandas/:id/start', () => {
    it('should return 400 with fewer than 3 participants', async () => {
      const { tanda, organizer } = await createTandaWithOrganizer();
      expect((await startTanda(tanda.id, organizer.token)).status).toBe(400);
    });

    it('should return 400 with exactly 2 participants', async () => {
      const { tanda, organizer } = await createTandaWithOrganizer();
      const m1 = await createUser('m1@test.com', 'M1');
      await joinTanda(tanda.id, m1.token);
      expect((await startTanda(tanda.id, organizer.token)).status).toBe(400);
    });

    it('should succeed with exactly 3 participants', async () => {
      const { tandaId, organizer } = await createTandaWith3Members();
      const res = await startTanda(tandaId, organizer.token);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('active');
      expect(res.body.currentRound).toBe(1);
    });

    it('should return 403 when non-organizer starts', async () => {
      const { tandaId, members } = await createTandaWith3Members();
      expect((await startTanda(tandaId, members[0].token)).status).toBe(403);
    });

    it('should assign unique rotation positions', async () => {
      const { tandaId, organizer } = await createTandaWith3Members();
      await startTanda(tandaId, organizer.token);
      const parts = await request(app).get(`/api/tandas/${tandaId}/participants`);
      const positions = parts.body.map((p: { rotationPosition: number }) => p.rotationPosition);
      expect(positions.sort()).toEqual([1, 2, 3]);
    });

    it('should return 400 when starting already active tanda', async () => {
      const { tandaId, organizer } = await createTandaWith3Members();
      await startTanda(tandaId, organizer.token);
      expect((await startTanda(tandaId, organizer.token)).status).toBe(400);
    });

    it('should return 401 without auth token', async () => {
      const { tanda } = await createTandaWithOrganizer();
      expect((await request(app).post(`/api/tandas/${tanda.id}/start`)).status).toBe(401);
    });
  });

  describe('POST /api/tandas/:id/cancel', () => {
    it('should cancel a forming tanda', async () => {
      const { tanda, organizer } = await createTandaWithOrganizer();
      const res = await cancelTanda(tanda.id, organizer.token);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
    });

    it('should cancel an active tanda', async () => {
      const { tandaId, organizer } = await createTandaWith3Members();
      await startTanda(tandaId, organizer.token);
      const res = await cancelTanda(tandaId, organizer.token);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
    });

    it('should return 403 when non-organizer cancels', async () => {
      const { tandaId, members } = await createTandaWith3Members();
      expect((await cancelTanda(tandaId, members[0].token)).status).toBe(403);
    });

    it('should return 400 when cancelling completed tanda', async () => {
      const { tandaId, organizer } = await createTandaWith3Members();
      await startTanda(tandaId, organizer.token);
      await completeTanda(tandaId, organizer.token, 3);
      expect((await cancelTanda(tandaId, organizer.token)).status).toBe(400);
    });

    it('should return 400 when cancelling already cancelled tanda', async () => {
      const { tanda, organizer } = await createTandaWithOrganizer();
      await cancelTanda(tanda.id, organizer.token);
      expect((await cancelTanda(tanda.id, organizer.token)).status).toBe(400);
    });
  });

  describe('GET /api/tandas/:id/participants', () => {
    it('should return correct count', async () => {
      const { tanda } = await createTandaWithOrganizer();
      const m1 = await createUser('m1@test.com', 'M1');
      await joinTanda(tanda.id, m1.token);
      const res = await request(app).get(`/api/tandas/${tanda.id}/participants`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('Auth edge cases', () => {
    it('should return 401 with malformed token', async () => {
      const { tanda } = await createTandaWithOrganizer();
      const res = await request(app).post(`/api/tandas/${tanda.id}/start`).set('Authorization', 'Bearer not.a.valid.token');
      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid signature', async () => {
      const { tanda } = await createTandaWithOrganizer();
      const res = await request(app).post(`/api/tandas/${tanda.id}/start`).set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjF9.badsig');
      expect(res.status).toBe(401);
    });

    it('should return 401 without Bearer prefix', async () => {
      const { tanda } = await createTandaWithOrganizer();
      const res = await request(app).post(`/api/tandas/${tanda.id}/start`).set('Authorization', 'Token x');
      expect(res.status).toBe(401);
    });
  });
});
