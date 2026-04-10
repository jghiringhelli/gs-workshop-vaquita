import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { initializeDatabase } from '../db/schema';
import { ParticipantRepository } from './participant';
import { TandaRepository } from './tanda';
import { UserRepository } from './user';
import { ValidationError, NotFoundError } from '../errors';
import Database from 'better-sqlite3';

describe('ParticipantRepository', () => {
  let db: Database.Database;
  let participantRepo: ParticipantRepository;
  let tandaRepo: TandaRepository;
  let userRepo: UserRepository;
  let dbPath: string;
  let organizerId: string;
  let tandaId: string;

  beforeEach(() => {
    dbPath = path.join(process.cwd(), `test-participant-${Date.now()}.db`);
    process.env.DB_PATH = dbPath;
    db = initializeDatabase();
    participantRepo = new ParticipantRepository(db);
    tandaRepo = new TandaRepository(db);
    userRepo = new UserRepository(db);

    // Setup: create organizer and tanda
    const organizer = userRepo.create('organizer@example.com', 'Organizer');
    organizerId = organizer.id;
    const tanda = tandaRepo.create('Test Tanda', organizerId, 1000, 12);
    tandaId = tanda.id;
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    delete process.env.DB_PATH;
  });

  describe('create', () => {
    it('should create organizer participant', () => {
      const participant = participantRepo.create(organizerId, tandaId, 'organizer');

      expect(participant).toMatchObject({
        userId: organizerId,
        tandaId,
        role: 'organizer',
        rotationPosition: null,
        consecutiveMissed: 0,
        isDefaulter: false,
      });
    });

    it('should reject duplicate user in tanda', () => {
      participantRepo.create(organizerId, tandaId, 'organizer');

      expect(() => {
        participantRepo.create(organizerId, tandaId, 'member');
      }).toThrow(ValidationError);
    });
  });

  describe('getById', () => {
    it('should retrieve participant by id', () => {
      const created = participantRepo.create(organizerId, tandaId, 'organizer');
      const retrieved = participantRepo.getById(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should throw NotFoundError for non-existent participant', () => {
      expect(() => {
        participantRepo.getById('non-existent');
      }).toThrow(NotFoundError);
    });
  });

  describe('getByTanda', () => {
    it('should retrieve all participants in tanda', () => {
      const p1 = participantRepo.create(organizerId, tandaId, 'organizer');
      const user2 = userRepo.create('user2@example.com', 'User 2');
      const p2 = participantRepo.create(user2.id, tandaId, 'member');

      const participants = participantRepo.getByTanda(tandaId);

      expect(participants).toHaveLength(2);
      expect(participants.map((p) => p.id)).toContain(p1.id);
      expect(participants.map((p) => p.id)).toContain(p2.id);
    });
  });

  describe('getByUserAndTanda', () => {
    it('should find participant for user in tanda', () => {
      const p = participantRepo.create(organizerId, tandaId, 'organizer');
      const found = participantRepo.getByUserAndTanda(organizerId, tandaId);

      expect(found).toEqual(p);
    });

    it('should return null if user not in tanda', () => {
      const user2 = userRepo.create('user2@example.com', 'User 2');
      const found = participantRepo.getByUserAndTanda(user2.id, tandaId);

      expect(found).toBeNull();
    });
  });

  describe('updateRotationOrder', () => {
    it('should assign rotation positions', () => {
      const p1 = participantRepo.create(organizerId, tandaId, 'organizer');
      const user2 = userRepo.create('user2@example.com', 'User 2');
      const p2 = participantRepo.create(user2.id, tandaId, 'member');

      participantRepo.updateRotationOrder(tandaId, [p2.id, p1.id]);

      const updated1 = participantRepo.getById(p1.id);
      const updated2 = participantRepo.getById(p2.id);

      expect(updated2.rotationPosition).toBe(0);
      expect(updated1.rotationPosition).toBe(1);
    });
  });

  describe('markAsDefaulter', () => {
    it('should mark participant as defaulter', () => {
      const p = participantRepo.create(organizerId, tandaId, 'organizer');

      participantRepo.markAsDefaulter(p.id);

      const updated = participantRepo.getById(p.id);
      expect(updated.isDefaulter).toBe(true);
    });
  });

  describe('resetConsecutiveMissed', () => {
    it('should reset consecutive missed count', () => {
      const p = participantRepo.create(organizerId, tandaId, 'organizer');
      participantRepo.incrementConsecutiveMissed(p.id);
      participantRepo.incrementConsecutiveMissed(p.id);

      participantRepo.resetConsecutiveMissed(p.id);

      const updated = participantRepo.getById(p.id);
      expect(updated.consecutiveMissed).toBe(0);
    });
  });

  describe('incrementConsecutiveMissed', () => {
    it('should increment consecutive missed', () => {
      const p = participantRepo.create(organizerId, tandaId, 'organizer');

      participantRepo.incrementConsecutiveMissed(p.id);
      participantRepo.incrementConsecutiveMissed(p.id);

      const updated = participantRepo.getById(p.id);
      expect(updated.consecutiveMissed).toBe(2);
    });
  });
});
