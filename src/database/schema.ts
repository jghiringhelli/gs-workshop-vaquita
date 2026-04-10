import type Database from "better-sqlite3";

/**
 * Runs all CREATE TABLE statements to initialise the schema.
 * Safe to call on every startup — uses IF NOT EXISTS.
 * @param db - The SQLite database connection.
 */
export function runMigrations(db: Database.Database): void {
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
      contribution_amount INTEGER NOT NULL,
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
      consecutive_misses INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, tanda_id)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id             TEXT PRIMARY KEY,
      tanda_id       TEXT NOT NULL REFERENCES tandas(id),
      participant_id TEXT NOT NULL REFERENCES participants(id),
      round          INTEGER NOT NULL,
      amount         INTEGER NOT NULL,
      status         TEXT NOT NULL DEFAULT 'pending',
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(participant_id, round)
    );
  `);
}
