import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { resetDatabase } from '../db/database';
import { createTandaWith3Members } from './test-helpers';
import * as tandaService from '../services/tanda.service';
import * as userService from '../services/user.service';
import * as userRepo from '../repositories/user.repository';

describe('Coverage gap tests', () => {
  beforeEach(() => {
    resetDatabase();
  });

  describe('advanceRound — current_round >= total_rounds guard', () => {
    it('should return 400 when current_round equals total_rounds (totalRounds=1)', async () => {
      const { tandaId, organizer } = await createTandaWith3Members({ totalRounds: 1 });
      await request(app).post(`/api/tandas/${tandaId}/start`).set('Authorization', `Bearer ${organizer.token}`);

      const res = await request(app)
        .post(`/api/tandas/${tandaId}/advance`)
        .set('Authorization', `Bearer ${organizer.token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already completed');
    });
  });

  describe('startTanda — total_rounds === 0 override', () => {
    it('should override totalRounds to participant count when total_rounds is 0', () => {
      const user = userRepo.createUser('direct@test.com', 'Direct');
      const tanda = tandaService.createTanda(user.id, 'Zero Rounds', 500, 0);
      expect(tanda.totalRounds).toBe(0);

      const u2 = userRepo.createUser('u2@test.com', 'U2');
      const u3 = userRepo.createUser('u3@test.com', 'U3');
      tandaService.joinTanda(u2.id, tanda.id);
      tandaService.joinTanda(u3.id, tanda.id);

      const started = tandaService.startTanda(user.id, tanda.id);
      expect(started.status).toBe('active');
      expect(started.totalRounds).toBe(3);
    });
  });

  describe('createTanda — user not found', () => {
    it('should throw NotFoundError when userId does not exist', () => {
      expect(() => tandaService.createTanda(999, 'Ghost Tanda', 500)).toThrow('User not found');
    });
  });

  describe('joinTanda — user not found', () => {
    it('should throw NotFoundError when joining user does not exist', () => {
      const user = userRepo.createUser('real@test.com', 'Real');
      const tanda = tandaService.createTanda(user.id, 'Real Tanda', 500);
      expect(() => tandaService.joinTanda(999, tanda.id)).toThrow('User not found');
    });
  });

  describe('getDb() lazy initialization fallback', () => {
    it('should auto-initialize database if getDb called without prior init', async () => {
      vi.resetModules();
      const freshDb = await import('../db/database');
      const db = freshDb.getDb();
      expect(db).toBeDefined();
      freshDb.initializeDatabase();
    });
  });

  describe('POST /api/tandas without auth or organizerId', () => {
    it('should return 401 when no token and no organizerId', async () => {
      const res = await request(app)
        .post('/api/tandas')
        .send({ name: 'No Auth', contributionAmount: 500 });

      expect(res.status).toBe(401);
    });
  });

  describe('Route catch branches — force errors in list endpoints', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return 500 when listTandas throws unexpected error', async () => {
      vi.spyOn(tandaService, 'listTandas').mockImplementation(() => { throw new Error('DB exploded'); });
      const res = await request(app).get('/api/tandas');
      expect(res.status).toBe(500);
    });

    it('should return 500 when listUsers throws unexpected error', async () => {
      vi.spyOn(userService, 'listUsers').mockImplementation(() => { throw new Error('DB exploded'); });
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(500);
    });

    it('should return 500 when getParticipants throws unexpected error', async () => {
      vi.spyOn(tandaService, 'getParticipants').mockImplementation(() => { throw new Error('DB exploded'); });
      const res = await request(app).get('/api/tandas/1/participants');
      expect(res.status).toBe(500);
    });
  });
});
