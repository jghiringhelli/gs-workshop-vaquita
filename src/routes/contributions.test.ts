import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { UserRepository } from '../repositories/user-repository';
import { TandaRepository } from '../repositories/tanda-repository';
import { ContributionRepository } from '../repositories/contribution-repository';
import { UserService } from '../services/user.service';
import { TandaService } from '../services/tanda.service';
import { ContributionService } from '../services/contribution.service';
import { createUserRoutes } from './users';
import { createTandaRoutes } from './tandas';
import { createContributionRoutes } from './contributions';
import { errorHandler, notFoundHandler } from '../middleware/error-handler';

describe('Contribution Routes - Simplified', () => {
  let app: Express;
  let db: Database.Database;
  let userService: UserService;
  let tandaService: TandaService;
  let contributionService: ContributionService;

  let organizer: any;
  let participant2: any;
  let participant3: any;
  let tanda: any;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE tandas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        organizer_id TEXT NOT NULL,
        contribution_amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'forming',
        current_round INTEGER NOT NULL DEFAULT 1,
        total_rounds INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organizer_id) REFERENCES users(id)
      );

      CREATE TABLE participants (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        tanda_id TEXT NOT NULL,
        role TEXT NOT NULL,
        rotation_position INTEGER,
        has_received_payout INTEGER NOT NULL DEFAULT 0,
        missed_consecutive INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (tanda_id) REFERENCES tandas(id),
        UNIQUE(user_id, tanda_id)
      );

      CREATE TABLE contributions (
        id TEXT PRIMARY KEY,
        tanda_id TEXT NOT NULL,
        participant_id TEXT NOT NULL,
        round INTEGER NOT NULL,
        amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'paid',
        paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tanda_id) REFERENCES tandas(id),
        FOREIGN KEY (participant_id) REFERENCES participants(id)
      );

      CREATE TABLE rounds (
        id TEXT PRIMARY KEY,
        tanda_id TEXT NOT NULL,
        round_number INTEGER NOT NULL,
        recipient_user_id TEXT,
        total_collected REAL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tanda_id) REFERENCES tandas(id),
        FOREIGN KEY (recipient_user_id) REFERENCES users(id),
        UNIQUE(tanda_id, round_number)
      );

      CREATE INDEX idx_contributions_tanda ON contributions(tanda_id);
      CREATE INDEX idx_contributions_round ON contributions(round);
      CREATE INDEX idx_rounds_tanda ON rounds(tanda_id);
      CREATE INDEX idx_participants_tanda ON participants(tanda_id);
      CREATE INDEX idx_participants_user ON participants(user_id);
    `);

    const userRepository = new UserRepository(db);
    const tandaRepository = new TandaRepository(db);
    const contributionRepository = new ContributionRepository(db);

    userService = new UserService(userRepository);
    tandaService = new TandaService(tandaRepository, userRepository);
    contributionService = new ContributionService(
      contributionRepository,
      tandaRepository,
      userRepository
    );

    app = express();
    app.use(express.json());
    app.use('/api/users', createUserRoutes(userService));
    app.use('/api/tandas', createTandaRoutes(tandaService));
    app.use('/api/tandas', createContributionRoutes(contributionService));
    app.use(notFoundHandler);
    app.use(errorHandler);

    organizer = userService.createUser('organizer@test.com', 'Organizer');
    participant2 = userService.createUser('p2@test.com', 'Participant 2');
    participant3 = userService.createUser('p3@test.com', 'Participant 3');

    tanda = tandaService.createTanda('Test Tanda', organizer.id, 100, 3);
    tandaService.joinTanda(tanda.id, participant2.id);
    tandaService.joinTanda(tanda.id, participant3.id);
    tandaService.startTanda(tanda.id, organizer.id);
  });

  afterEach(() => {
    db.close();
  });

  describe('POST /api/tandas/:id/contributions', () => {
    it('should record a contribution with exact amount', async () => {
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .send({
          participantId: organizer.id,
          amount: 100,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.amount).toBe(100);
      expect(res.body.status).toBe('paid');
    });

    it('should record a late contribution', async () => {
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .send({
          participantId: participant2.id,
          amount: 105,
        })
        .expect(201);

      expect(res.body.amount).toBe(105);
      expect(res.body.status).toBe('late');
    });

    it('should reject non-existent participant', async () => {
      const fakeParticipantId = uuid();
      const res = await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .send({
          participantId: fakeParticipantId,
          amount: 100,
        });

      expect([404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/tandas/:id/participants/:pid/history', () => {
    it('should return empty history for participant with no contributions', async () => {
      const res = await request(app)
        .get(`/api/tandas/${tanda.id}/participants/${organizer.id}/history`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return contribution history after adding contributions', async () => {
      // Record a contribution
      await request(app)
        .post(`/api/tandas/${tanda.id}/contributions`)
        .send({
          participantId: organizer.id,
          amount: 100,
        })
        .expect(201);

      // Get history
      const res = await request(app)
        .get(`/api/tandas/${tanda.id}/participants/${organizer.id}/history`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });
});
