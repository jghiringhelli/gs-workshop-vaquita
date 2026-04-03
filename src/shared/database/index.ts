import Database from 'better-sqlite3';
import path from 'path';
import { config } from '../config';

const resolvePath = (): string => {
  const url = config.databaseUrl;
  if (url === ':memory:') return ':memory:';
  const stripped = url.startsWith('file:') ? url.slice(5) : url;
  return path.resolve(stripped);
};

let db: Database.Database | null = null;

/** Returns the singleton SQLite connection, creating and migrating it on first call. */
export const getDatabase = (): Database.Database => {
  if (!db) {
    db = new Database(resolvePath());
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
  }
  return db;
};

/** Closes and destroys the current connection (used in tests). */
export const closeDatabase = (): void => {
  if (db) {
    db.close();
    db = null;
  }
};

const runMigrations = (database: Database.Database): void => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      email       TEXT UNIQUE NOT NULL,
      name        TEXT NOT NULL,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id                  TEXT PRIMARY KEY,
      name                TEXT NOT NULL,
      organizer_id        TEXT NOT NULL,
      contribution_amount REAL NOT NULL,
      status              TEXT NOT NULL DEFAULT 'forming',
      current_round       INTEGER NOT NULL DEFAULT 0,
      total_rounds        INTEGER NOT NULL,
      created_at          TEXT NOT NULL,
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS participants (
      id                 TEXT PRIMARY KEY,
      user_id            TEXT NOT NULL,
      tanda_id           TEXT NOT NULL,
      role               TEXT NOT NULL DEFAULT 'member',
      rotation_position  INTEGER,
      consecutive_missed INTEGER NOT NULL DEFAULT 0,
      is_defaulter       INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id)  REFERENCES users(id),
      FOREIGN KEY (tanda_id) REFERENCES tandas(id),
      UNIQUE(user_id, tanda_id)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id             TEXT PRIMARY KEY,
      tanda_id       TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      round          INTEGER NOT NULL,
      amount         REAL NOT NULL,
      status         TEXT NOT NULL DEFAULT 'pending',
      penalty_amount REAL NOT NULL DEFAULT 0,
      created_at     TEXT NOT NULL,
      FOREIGN KEY (tanda_id)       REFERENCES tandas(id),
      FOREIGN KEY (participant_id) REFERENCES participants(id),
      UNIQUE(participant_id, round)
    );
  `);
};
