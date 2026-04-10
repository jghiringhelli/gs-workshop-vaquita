import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { initializeDatabase } from '../db/schema';
import { TandaRepository } from './tanda';
import { UserRepository } from './user';
import { NotFoundError } from '../errors';
import Database from 'better-sqlite3';

describe('TandaRepository', () => {
  let db: Database.Database;
  let tandaRepo: TandaRepository;
  let userRepo: UserRepository;
  let dbPath: string;
  let organizerId: string;

  beforeEach(() => {
    dbPath = path.join(process.cwd(), `test-tanda-${Date.now()}.db`);
    process.env.DB_PATH = dbPath;
    db = initializeDatabase();
    tandaRepo = new TandaRepository(db);
    userRepo = new UserRepository(db);

    // Create organizer
    const organizer = userRepo.create('organizer@example.com', 'Organizer');
    organizerId = organizer.id;
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    delete process.env.DB_PATH;
  });

  describe('create', () => {
    it('should create a tanda in forming status', () => {
      const tanda = tandaRepo.create('Tanda Enero', organizerId, 1000, 12);

      expect(tanda).toMatchObject({
        name: 'Tanda Enero',
        organizerId,
        contributionAmount: 1000,
        totalRounds: 12,
        status: 'forming',
        currentRound: 0,
      });
      expect(tanda.id).toBeDefined();
      expect(tanda.created_at).toBeDefined();
    });
  });

  describe('getById', () => {
    it('should retrieve tanda by id', () => {
      const created = tandaRepo.create('Test Tanda', organizerId, 500, 6);
      const retrieved = tandaRepo.getById(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should throw NotFoundError for non-existent tanda', () => {
      expect(() => {
        tandaRepo.getById('non-existent');
      }).toThrow(NotFoundError);
    });

    it('should not return soft-deleted tanda', () => {
      const tanda = tandaRepo.create('Test Tanda', organizerId, 500, 6);
      tandaRepo.update(tanda.id, { status: 'active' });
      tandaRepo.cancel(tanda.id);

      expect(() => {
        tandaRepo.getById(tanda.id);
      }).toThrow(NotFoundError);
    });
  });

  describe('list', () => {
    it('should list all tandas for user', () => {
      const user = userRepo.create('user@example.com', 'User');
      const tanda1 = tandaRepo.create('Tanda 1', organizerId, 500, 6);
      tandaRepo.create('Tanda 2', user.id, 1000, 12);

      const tandas = tandaRepo.list(organizerId);

      expect(tandas).toHaveLength(1);
      expect(tandas[0].id).toBe(tanda1.id);
    });

    it('should list all tandas when no organizerId filter', () => {
      const user = userRepo.create('user@example.com', 'User');
      tandaRepo.create('Tanda 1', organizerId, 500, 6);
      tandaRepo.create('Tanda 2', user.id, 1000, 12);

      const tandas = tandaRepo.list();

      expect(tandas).toHaveLength(2);
    });

    it('should exclude soft-deleted tandas', () => {
      const tanda1 = tandaRepo.create('Tanda 1', organizerId, 500, 6);
      const tanda2 = tandaRepo.create('Tanda 2', organizerId, 1000, 12);

      tandaRepo.update(tanda1.id, { status: 'active' });
      tandaRepo.cancel(tanda1.id);

      const tandas = tandaRepo.list();

      expect(tandas).toHaveLength(1);
      expect(tandas[0].id).toBe(tanda2.id);
    });
  });

  describe('update', () => {
    it('should update tanda status', () => {
      const tanda = tandaRepo.create('Test Tanda', organizerId, 500, 6);
      const updated = tandaRepo.update(tanda.id, { status: 'active' });

      expect(updated.status).toBe('active');
    });

    it('should update current round', () => {
      const tanda = tandaRepo.create('Test Tanda', organizerId, 500, 6);
      tandaRepo.update(tanda.id, { status: 'active' });
      const updated = tandaRepo.update(tanda.id, { currentRound: 1 });

      expect(updated.currentRound).toBe(1);
    });

    it('should update both status and currentRound', () => {
      const tanda = tandaRepo.create('Test Tanda', organizerId, 500, 6);
      const updated = tandaRepo.update(tanda.id, { status: 'active', currentRound: 1 });

      expect(updated.status).toBe('active');
      expect(updated.currentRound).toBe(1);
    });
  });

  describe('cancel', () => {
    it('should hard delete tanda in forming status', () => {
      const tanda = tandaRepo.create('Test Tanda', organizerId, 500, 6);

      tandaRepo.cancel(tanda.id);

      expect(() => {
        tandaRepo.getById(tanda.id);
      }).toThrow(NotFoundError);
    });

    it('should soft delete active tanda', () => {
      const tanda = tandaRepo.create('Test Tanda', organizerId, 500, 6);
      tandaRepo.update(tanda.id, { status: 'active' });

      tandaRepo.cancel(tanda.id);

      expect(() => {
        tandaRepo.getById(tanda.id);
      }).toThrow(NotFoundError);
    });
  });
});
