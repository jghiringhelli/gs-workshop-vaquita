import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { initializeDatabase } from './schema';

describe('Database Schema', () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(process.cwd(), `test-${Date.now()}.db`);
    process.env.DB_PATH = dbPath;
  });

  afterEach(() => {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    delete process.env.DB_PATH;
  });

  it('should initialize database with all tables', () => {
    const db = initializeDatabase();

    // Check that all tables exist
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
      )
      .all() as Array<{ name: string }>;

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('tandas');
    expect(tableNames).toContain('participants');
    expect(tableNames).toContain('contributions');

    db.close();
  });

  it('should enforce foreign key constraints', () => {
    const db = initializeDatabase();

    // Try to insert a tanda with non-existent organizer - should fail
    expect(() => {
      db.prepare(
        `
        INSERT INTO tandas (id, name, organizer_id, contribution_amount, total_rounds)
        VALUES ('t1', 'Test', 'nonexistent_user', 100, 5)
      `
      ).run();
    }).toThrow();

    db.close();
  });

  it('should create indexes for performance', () => {
    const db = initializeDatabase();

    const indexes = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'`
      )
      .all() as Array<{ name: string }>;

    const indexNames = indexes.map((i) => i.name);
    expect(indexNames).toContain('idx_tandas_organizer');
    expect(indexNames).toContain('idx_participants_tanda');
    expect(indexNames).toContain('idx_contributions_tanda');

    db.close();
  });

  it('should allow valid status values for tanda', () => {
    const db = initializeDatabase();

    // Insert a user first
    db.prepare(
      `INSERT INTO users (id, email, name) VALUES ('u1', 'test@example.com', 'Test')`
    ).run();

    // Valid status values should work
    const validStatuses = ['forming', 'active', 'completed', 'cancelled'];
    validStatuses.forEach((status) => {
      db.prepare(
        `
        INSERT INTO tandas (id, name, organizer_id, contribution_amount, total_rounds, status)
        VALUES (?, ?, 'u1', 100, 5, ?)
      `
      ).run(`t_${status}`, `Tanda ${status}`, status);
    });

    const tandas = db
      .prepare(`SELECT status FROM tandas`)
      .all() as Array<{ status: string }>;
    expect(tandas).toHaveLength(4);

    // Invalid status should fail
    expect(() => {
      db.prepare(
        `
        INSERT INTO tandas (id, name, organizer_id, contribution_amount, total_rounds, status)
        VALUES ('t_invalid', 'Invalid', 'u1', 100, 5, 'invalid_status')
      `
      ).run();
    }).toThrow();

    db.close();
  });

  it('should prevent duplicate user emails', () => {
    const db = initializeDatabase();

    db.prepare(
      `INSERT INTO users (id, email, name) VALUES ('u1', 'test@example.com', 'Test')`
    ).run();

    expect(() => {
      db.prepare(
        `INSERT INTO users (id, email, name) VALUES ('u2', 'test@example.com', 'Another')`
      ).run();
    }).toThrow();

    db.close();
  });

  it('should prevent duplicate participant entries', () => {
    const db = initializeDatabase();

    // Setup: user and tanda
    db.prepare(
      `INSERT INTO users (id, email, name) VALUES ('u1', 'test@example.com', 'Test')`
    ).run();
    db.prepare(
      `INSERT INTO tandas (id, name, organizer_id, contribution_amount, total_rounds)
       VALUES ('t1', 'Tanda', 'u1', 100, 5)`
    ).run();

    // Add participant
    db.prepare(
      `INSERT INTO participants (id, user_id, tanda_id, role)
       VALUES ('p1', 'u1', 't1', 'organizer')`
    ).run();

    // Duplicate should fail
    expect(() => {
      db.prepare(
        `INSERT INTO participants (id, user_id, tanda_id, role)
         VALUES ('p2', 'u1', 't1', 'member')`
      ).run();
    }).toThrow();

    db.close();
  });
});
