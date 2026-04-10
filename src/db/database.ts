import Database from 'better-sqlite3';
import { config } from '../config';

/**
 * Creates and configures a SQLite database connection.
 * Runs all schema migrations on first use.
 * @param path - Database file path or ':memory:' for in-memory (defaults to config value)
 * @returns Configured better-sqlite3 Database instance
 */
export function createDatabase(path: string = config.databasePath): Database.Database {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

/**
 * Applies all schema migrations idempotently (CREATE TABLE IF NOT EXISTS).
 * @param db - Open database connection
 */
function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      email       TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id                  TEXT PRIMARY KEY,
      name                TEXT NOT NULL,
      organizer_id        TEXT NOT NULL REFERENCES users(id),
      contribution_amount REAL NOT NULL,
      status              TEXT NOT NULL DEFAULT 'forming',
      current_round       INTEGER NOT NULL DEFAULT 1,
      total_rounds        INTEGER NOT NULL DEFAULT 0,
      created_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS participants (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL REFERENCES users(id),
      tanda_id          TEXT NOT NULL REFERENCES tandas(id),
      role              TEXT NOT NULL DEFAULT 'member',
      rotation_position INTEGER,
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, tanda_id)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id             TEXT PRIMARY KEY,
      tanda_id       TEXT NOT NULL REFERENCES tandas(id),
      participant_id TEXT NOT NULL REFERENCES participants(id),
      round          INTEGER NOT NULL,
      amount         REAL NOT NULL,
      status         TEXT NOT NULL DEFAULT 'pending',
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(participant_id, round)
    );
  `);
}
