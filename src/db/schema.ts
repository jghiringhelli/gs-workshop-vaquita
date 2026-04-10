import { getDb } from "./database";

/**
 * Creates all tables if they do not already exist.
 * Safe to call multiple times — uses IF NOT EXISTS.
 */
export function initializeSchema(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT    NOT NULL UNIQUE,
      name  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      name               TEXT    NOT NULL,
      organizer_id       INTEGER NOT NULL REFERENCES users(id),
      contribution_amount INTEGER NOT NULL,
      status             TEXT    NOT NULL DEFAULT 'forming',
      current_round      INTEGER NOT NULL DEFAULT 0,
      total_rounds       INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS participants (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      tanda_id          INTEGER NOT NULL REFERENCES tandas(id),
      user_id           INTEGER NOT NULL REFERENCES users(id),
      role              TEXT    NOT NULL DEFAULT 'member',
      rotation_position INTEGER,
      consecutive_misses INTEGER NOT NULL DEFAULT 0,
      is_defaulter      INTEGER NOT NULL DEFAULT 0,
      UNIQUE(tanda_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      tanda_id       INTEGER NOT NULL REFERENCES tandas(id),
      participant_id INTEGER NOT NULL REFERENCES participants(id),
      round          INTEGER NOT NULL,
      amount         INTEGER NOT NULL,
      status         TEXT    NOT NULL DEFAULT 'pending',
      UNIQUE(tanda_id, participant_id, round)
    );
  `);
}

/**
 * Deletes all rows from all tables — for test isolation only.
 */
export function resetSchemaData(): void {
  const db = getDb();
  db.exec(`
    DELETE FROM contributions;
    DELETE FROM participants;
    DELETE FROM tandas;
    DELETE FROM users;
  `);
}
