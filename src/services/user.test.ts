import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { initializeDatabase } from '../db/schema';
import { UserService } from './user';
import { RepositoryFactory } from '../repositories';
import { ValidationError, NotFoundError } from '../errors';
import Database from 'better-sqlite3';

describe('UserService', () => {
  let db: Database.Database;
  let service: UserService;
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(process.cwd(), `test-user-service-${Date.now()}.db`);
    process.env.DB_PATH = dbPath;
    db = initializeDatabase();
    const repos = new RepositoryFactory(db);
    service = new UserService(repos.getUsers());
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    delete process.env.DB_PATH;
  });

  it('should create a user', () => {
    const user = service.create({
      email: 'test@example.com',
      name: 'John Doe',
    });

    expect(user).toMatchObject({
      email: 'test@example.com',
      name: 'John Doe',
    });
  });

  it('should get user by id', () => {
    const created = service.create({
      email: 'test@example.com',
      name: 'John Doe',
    });

    const retrieved = service.getById(created.id);
    expect(retrieved).toEqual(created);
  });

  it('should get user by email', () => {
    const created = service.create({
      email: 'test@example.com',
      name: 'John Doe',
    });

    const retrieved = service.getByEmail('test@example.com');
    expect(retrieved).toEqual(created);
  });

  it('should list users', () => {
    service.create({ email: 'user1@example.com', name: 'User 1' });
    service.create({ email: 'user2@example.com', name: 'User 2' });

    const users = service.list();
    expect(users).toHaveLength(2);
  });

  it('should reject duplicate email', () => {
    service.create({ email: 'test@example.com', name: 'John Doe' });

    expect(() => {
      service.create({ email: 'test@example.com', name: 'Jane Doe' });
    }).toThrow(ValidationError);
  });
});
