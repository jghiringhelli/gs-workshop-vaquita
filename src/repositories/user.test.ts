import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { initializeDatabase } from '../db/schema';
import { UserRepository } from './user';
import { NotFoundError, ValidationError } from '../errors';
import Database from 'better-sqlite3';

describe('UserRepository', () => {
  let db: Database.Database;
  let repo: UserRepository;
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(process.cwd(), `test-user-${Date.now()}.db`);
    process.env.DB_PATH = dbPath;
    db = initializeDatabase();
    repo = new UserRepository(db);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    delete process.env.DB_PATH;
  });

  describe('create', () => {
    it('should create a user with normalized response', () => {
      const user = repo.create('test@example.com', 'John Doe');

      expect(user).toMatchObject({
        email: 'test@example.com',
        name: 'John Doe',
      });
      expect(user.id).toBeDefined();
      expect(user.created_at).toBeDefined();
    });

    it('should reject duplicate email', () => {
      repo.create('test@example.com', 'John Doe');

      expect(() => {
        repo.create('test@example.com', 'Jane Doe');
      }).toThrow(ValidationError);
    });
  });

  describe('getById', () => {
    it('should retrieve user by id', () => {
      const created = repo.create('test@example.com', 'John Doe');
      const retrieved = repo.getById(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should throw NotFoundError for non-existent user', () => {
      expect(() => {
        repo.getById('non-existent');
      }).toThrow(NotFoundError);
    });
  });

  describe('getByEmail', () => {
    it('should retrieve user by email', () => {
      const created = repo.create('test@example.com', 'John Doe');
      const retrieved = repo.getByEmail('test@example.com');

      expect(retrieved).toEqual(created);
    });

    it('should throw NotFoundError for non-existent email', () => {
      expect(() => {
        repo.getByEmail('nonexistent@example.com');
      }).toThrow(NotFoundError);
    });
  });

  describe('list', () => {
    it('should list all users', () => {
      const user1 = repo.create('user1@example.com', 'User 1');
      const user2 = repo.create('user2@example.com', 'User 2');

      const users = repo.list();

      expect(users).toHaveLength(2);
      expect(users).toContainEqual(user1);
      expect(users).toContainEqual(user2);
    });

    it('should return empty array when no users', () => {
      const users = repo.list();
      expect(users).toHaveLength(0);
    });

    it('should be ordered by created_at DESC', () => {
      const user1 = repo.create('user1@example.com', 'User 1');
      const user2 = repo.create('user2@example.com', 'User 2');

      const users = repo.list();

      expect(users[0].id).toBe(user2.id);
      expect(users[1].id).toBe(user1.id);
    });
  });
});
