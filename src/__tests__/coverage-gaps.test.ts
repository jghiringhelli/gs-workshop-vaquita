import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { resetDatabase } from '../db/database';
import { createUser } from './test-helpers';
import * as tandaService from '../services/tanda.service';
import * as userService from '../services/user.service';
import * as userRepo from '../repositories/user.repository';

describe('Coverage gap tests', () => {
  beforeEach(() => {
    resetDatabase();
  });

  describe('advanceRound — current_round >= total_rounds guard', () => {
    it('should return 400 when current_round equals total_rounds (totalRounds=1)', async () => {
      const org = await createUser('org@test.com', 'Org');
      const m1 = await createUser('m1@test.com', 'M1');
      const m2 = await createUser('m2@test.com', 'M2');

      // Create tanda with totalRounds=1
      const tandaRes = await request(app)
        .post('/api/tandas')
        .set('Authorization', `Bearer ${org.token}`)
        .send({ name: 'One Round', contributionAmount: 100, totalRounds: 1 });

      await request(app).post(`/api/tandas/${tandaRes.body.id}/join`).set('Authorization', `Bearer ${m1.token}`);
      await request(app).post(`/api/tandas/${tandaRes.body.id}/join`).set('Authorization', `Bearer ${m2.token}`);

      // Start: current_round becomes 1, total_rounds is 1
      await request(app)
        .post(`/api/tandas/${tandaRes.body.id}/start`)
        .set('Authorization', `Bearer ${org.token}`);

      // Advance should hit current_round(1) >= total_rounds(1) guard
      const res = await request(app)
        .post(`/api/tandas/${tandaRes.body.id}/advance`)
        .set('Authorization', `Bearer ${org.token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already completed');
    });
  });

  describe('startTanda — total_rounds === 0 override', () => {
    it('should override totalRounds to participant count when total_rounds is 0', () => {
      // Create user directly via repo (bypass API)
      const user = userRepo.createUser('direct@test.com', 'Direct');

      // Create tanda with totalRounds=0 via service directly
      const tanda = tandaService.createTanda(user.id, 'Zero Rounds', 500, 0);
      expect(tanda.totalRounds).toBe(0);

      // Add 2 more users and join
      const u2 = userRepo.createUser('u2@test.com', 'U2');
      const u3 = userRepo.createUser('u3@test.com', 'U3');
      tandaService.joinTanda(u2.id, tanda.id);
      tandaService.joinTanda(u3.id, tanda.id);

      // Start should override totalRounds from 0 to participant count (3)
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

  describe('Route error branches — GET /api/tandas with tanda not found', () => {
    it('should return 404 for GET /api/tandas/:id/participants on nonexistent tanda', async () => {
      const res = await request(app).get('/api/tandas/999/participants');
      expect(res.status).toBe(404);
    });
  });

  describe('Route error branches — POST /api/tandas without auth or organizerId', () => {
    it('should return 401 when no token and no organizerId', async () => {
      const res = await request(app)
        .post('/api/tandas')
        .send({ name: 'No Auth', contributionAmount: 500 });

      expect(res.status).toBe(401);
    });
  });

  describe('Route error branches — GET /api/tandas with NaN userId', () => {
    it('should handle non-numeric userId query gracefully', async () => {
      const res = await request(app).get('/api/tandas?userId=notanumber');
      // NaN gets passed to the service, which handles it
      expect(res.status).toBe(200);
    });
  });

  describe('Round summary — recipient is null when no matching rotation position', () => {
    it('should return null recipient for round with no matching rotation', async () => {
      const org = await createUser('org@test.com', 'Org');
      const m1 = await createUser('m1@test.com', 'M1');
      const m2 = await createUser('m2@test.com', 'M2');

      // Create tanda with totalRounds=5 (more rounds than participants)
      const tandaRes = await request(app)
        .post('/api/tandas')
        .set('Authorization', `Bearer ${org.token}`)
        .send({ name: 'Many Rounds', contributionAmount: 100, totalRounds: 5 });

      await request(app).post(`/api/tandas/${tandaRes.body.id}/join`).set('Authorization', `Bearer ${m1.token}`);
      await request(app).post(`/api/tandas/${tandaRes.body.id}/join`).set('Authorization', `Bearer ${m2.token}`);

      await request(app)
        .post(`/api/tandas/${tandaRes.body.id}/start`)
        .set('Authorization', `Bearer ${org.token}`);

      // Round 5 has no participant with rotation_position=5 (only 3 participants, positions 1-3)
      const res = await request(app)
        .get(`/api/tandas/${tandaRes.body.id}/rounds/5`)
        .set('Authorization', `Bearer ${org.token}`);

      expect(res.status).toBe(200);
      expect(res.body.recipient).toBeNull();
    });
  });

  describe('Route catch branches — force errors in list endpoints', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return 500 when listTandas throws unexpected error', async () => {
      vi.spyOn(tandaService, 'listTandas').mockImplementation(() => {
        throw new Error('DB exploded');
      });

      const res = await request(app).get('/api/tandas');
      expect(res.status).toBe(500);
    });

    it('should return 500 when listUsers throws unexpected error', async () => {
      vi.spyOn(userService, 'listUsers').mockImplementation(() => {
        throw new Error('DB exploded');
      });

      const res = await request(app).get('/api/users');
      expect(res.status).toBe(500);
    });
  });
});
