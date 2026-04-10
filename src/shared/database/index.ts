import Database from 'better-sqlite3';
import { getConfig } from '../config/index.js';

let _db: Database.Database | null = null;

/**
 * Returns a singleton SQLite database connection.
 * Uses `:memory:` when NODE_ENV=test or DATABASE_PATH=:memory:.
 * @returns The shared Database instance
 */
export function getDb(): Database.Database {
  if (!_db) {
    const { dbPath, nodeEnv } = getConfig();
    const path = nodeEnv === 'test' ? ':memory:' : dbPath;
    _db = new Database(path);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    runMigrations(_db);
  }
  return _db;
}

/**
 * Clears all table data — intended for test teardown only.
 * Keeps the connection open so existing repository instances remain usable.
 */
export function resetDb(): void {
  if (_db) {
    _db.exec(`
      DELETE FROM contributions;
      DELETE FROM participants;
      DELETE FROM tandas;
      DELETE FROM users;
    `);
  }
}

/**
 * Runs all DDL migrations against the given database.
 * @param db - Target database instance
 */
function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id    TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id                 TEXT PRIMARY KEY,
      name               TEXT NOT NULL,
      organizer_id       TEXT NOT NULL,
      contribution_amount REAL NOT NULL,
      status             TEXT NOT NULL DEFAULT 'forming',
      current_round      INTEGER NOT NULL DEFAULT 0,
      total_rounds       INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS participants (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL,
      tanda_id          TEXT NOT NULL,
      role              TEXT NOT NULL DEFAULT 'member',
      rotation_position INTEGER,
      UNIQUE (user_id, tanda_id),
      FOREIGN KEY (user_id)  REFERENCES users(id),
      FOREIGN KEY (tanda_id) REFERENCES tandas(id)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id             TEXT PRIMARY KEY,
      tanda_id       TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      round          INTEGER NOT NULL,
      amount         REAL NOT NULL,
      status         TEXT NOT NULL DEFAULT 'pending',
      UNIQUE (participant_id, round),
      FOREIGN KEY (tanda_id)       REFERENCES tandas(id),
      FOREIGN KEY (participant_id) REFERENCES participants(id)
    );
  `);
}


