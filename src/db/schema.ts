import { getDatabase } from './database.js';

/** Creates all tables if they do not exist. Safe to call on every startup. */
export function runMigrations(): void {
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id    TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id                 TEXT PRIMARY KEY,
      name               TEXT NOT NULL,
      organizer_id       TEXT NOT NULL REFERENCES users(id),
      contribution_amount INTEGER NOT NULL,
      status             TEXT NOT NULL DEFAULT 'forming',
      current_round      INTEGER NOT NULL DEFAULT 1,
      total_rounds       INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS participants (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL REFERENCES users(id),
      tanda_id          TEXT NOT NULL REFERENCES tandas(id),
      role              TEXT NOT NULL DEFAULT 'member',
      rotation_position INTEGER,
      UNIQUE(user_id, tanda_id)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id             TEXT PRIMARY KEY,
      tanda_id       TEXT NOT NULL REFERENCES tandas(id),
      participant_id TEXT NOT NULL REFERENCES participants(id),
      round          INTEGER NOT NULL,
      amount         INTEGER NOT NULL,
      status         TEXT NOT NULL DEFAULT 'pending',
      UNIQUE(participant_id, round)
    );
  `);
}
