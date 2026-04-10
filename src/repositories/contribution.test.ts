import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { initializeDatabase } from '../db/schema';
import { ContributionRepository } from './contribution';
import { ParticipantRepository } from './participant';
import { TandaRepository } from './tanda';
import { UserRepository } from './user';
import { ValidationError, NotFoundError } from '../errors';
import Database from 'better-sqlite3';

describe('ContributionRepository', () => {
  let db: Database.Database;
  let contributionRepo: ContributionRepository;
  let participantRepo: ParticipantRepository;
  let tandaRepo: TandaRepository;
  let userRepo: UserRepository;
  let dbPath: string;
  let tandaId: string;
  let participantId: string;

  beforeEach(() => {
    dbPath = path.join(process.cwd(), `test-contribution-${Date.now()}.db`);
    process.env.DB_PATH = dbPath;
    db = initializeDatabase();
    contributionRepo = new ContributionRepository(db);
    participantRepo = new ParticipantRepository(db);
    tandaRepo = new TandaRepository(db);
    userRepo = new UserRepository(db);

    // Setup
    const organizer = userRepo.create('organizer@example.com', 'Organizer');
    const tanda = tandaRepo.create('Test Tanda', organizer.id, 1000, 12);
    tandaId = tanda.id;
    const participant = participantRepo.create(organizer.id, tandaId, 'organizer');
    participantId = participant.id;
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    delete process.env.DB_PATH;
  });

  describe('create', () => {
    it('should create contribution with pending status', () => {
      const contrib = contributionRepo.create(tandaId, participantId, 1, 1000);

      expect(contrib).toMatchObject({
        tandaId,
        participantId,
        round: 1,
        amount: 1000,
        status: 'pending',
        penaltyApplied: 0,
        paidAt: null,
      });
    });

    it('should reject duplicate contribution', () => {
      contributionRepo.create(tandaId, participantId, 1, 1000);

      expect(() => {
        contributionRepo.create(tandaId, participantId, 1, 1000);
      }).toThrow(ValidationError);
    });
  });

  describe('getById', () => {
    it('should retrieve contribution by id', () => {
      const created = contributionRepo.create(tandaId, participantId, 1, 1000);
      const retrieved = contributionRepo.getById(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should throw NotFoundError for non-existent contribution', () => {
      expect(() => {
        contributionRepo.getById('non-existent');
      }).toThrow(NotFoundError);
    });
  });

  describe('getByRound', () => {
    it('should retrieve all contributions in round', () => {
      const user2 = userRepo.create('user2@example.com', 'User 2');
      const p2 = participantRepo.create(user2.id, tandaId, 'member');

      const c1 = contributionRepo.create(tandaId, participantId, 1, 1000);
      const c2 = contributionRepo.create(tandaId, p2.id, 1, 1000);

      const contributions = contributionRepo.getByRound(tandaId, 1);

      expect(contributions).toHaveLength(2);
      expect(contributions.map((c) => c.id)).toContain(c1.id);
      expect(contributions.map((c) => c.id)).toContain(c2.id);
    });
  });

  describe('getHistory', () => {
    it('should retrieve all contributions by participant', () => {
      const c1 = contributionRepo.create(tandaId, participantId, 1, 1000);
      const c2 = contributionRepo.create(tandaId, participantId, 2, 1000);

      const history = contributionRepo.getHistory(participantId);

      expect(history).toHaveLength(2);
      expect(history.map((c) => c.id)).toContain(c1.id);
      expect(history.map((c) => c.id)).toContain(c2.id);
    });
  });

  describe('getOrCreate', () => {
    it('should return existing contribution', () => {
      const created = contributionRepo.create(tandaId, participantId, 1, 1000);
      const retrieved = contributionRepo.getOrCreate(tandaId, participantId, 1, 1000);

      expect(retrieved.id).toBe(created.id);
    });

    it('should create if not exists', () => {
      const contrib = contributionRepo.getOrCreate(tandaId, participantId, 1, 1000);

      expect(contrib.status).toBe('pending');
      expect(contrib.amount).toBe(1000);
    });
  });

  describe('updateStatus', () => {
    it('should update to paid status', () => {
      const contrib = contributionRepo.create(tandaId, participantId, 1, 1000);
      const paidAt = new Date().toISOString();

      const updated = contributionRepo.updateStatus(contrib.id, 'paid', paidAt);

      expect(updated.status).toBe('paid');
      expect(updated.paidAt).toBe(paidAt);
    });

    it('should apply penalty', () => {
      const contrib = contributionRepo.create(tandaId, participantId, 1, 1000);
      const penalty = 50;

      const updated = contributionRepo.updateStatus(contrib.id, 'late', undefined, penalty);

      expect(updated.status).toBe('late');
      expect(updated.penaltyApplied).toBe(50);
    });

    it('should mark as missed', () => {
      const contrib = contributionRepo.create(tandaId, participantId, 1, 1000);

      const updated = contributionRepo.updateStatus(contrib.id, 'missed');

      expect(updated.status).toBe('missed');
    });
  });

  describe('getLatePending', () => {
    it('should retrieve pending and late contributions', () => {
      contributionRepo.create(tandaId, participantId, 1, 1000);
      const user2 = userRepo.create('user2@example.com', 'User 2');
      const p2 = participantRepo.create(user2.id, tandaId, 'member');
      const c2 = contributionRepo.create(tandaId, p2.id, 1, 1000);

      contributionRepo.updateStatus(c2.id, 'late');

      const pending = contributionRepo.getLatePending(tandaId, 1);

      expect(pending).toHaveLength(2);
      expect(pending.map((c) => c.status)).toContain('pending');
      expect(pending.map((c) => c.status)).toContain('late');
    });
  });

  describe('getMissedByParticipant', () => {
    it('should retrieve recent missed contributions', () => {
      const c1 = contributionRepo.create(tandaId, participantId, 1, 1000);
      const c2 = contributionRepo.create(tandaId, participantId, 2, 1000);
      const c3 = contributionRepo.create(tandaId, participantId, 3, 1000);

      contributionRepo.updateStatus(c1.id, 'missed');
      contributionRepo.updateStatus(c2.id, 'missed');
      contributionRepo.updateStatus(c3.id, 'missed');

      const missed = contributionRepo.getMissedByParticipant(participantId, 2);

      expect(missed).toHaveLength(2);
      expect(missed[0].round).toBe(3);
      expect(missed[1].round).toBe(2);
    });
  });
});
