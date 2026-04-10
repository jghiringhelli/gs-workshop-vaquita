import Database from 'better-sqlite3';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tandas (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  organizer_id        TEXT NOT NULL,
  contribution_amount REAL NOT NULL,
  status              TEXT NOT NULL DEFAULT 'forming',
  current_round       INTEGER NOT NULL DEFAULT 0,
  total_rounds        INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organizer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS participants (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL,
  tanda_id            TEXT NOT NULL,
  role                TEXT NOT NULL DEFAULT 'member',
  rotation_position   INTEGER,
  consecutive_missed  INTEGER NOT NULL DEFAULT 0,
  is_defaulter        INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id)  REFERENCES users(id),
  FOREIGN KEY (tanda_id) REFERENCES tandas(id),
  UNIQUE (user_id, tanda_id)
);

CREATE TABLE IF NOT EXISTS contributions (
  id             TEXT PRIMARY KEY,
  tanda_id       TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  round          INTEGER NOT NULL,
  amount         REAL NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tanda_id)       REFERENCES tandas(id),
  FOREIGN KEY (participant_id) REFERENCES participants(id)
);
`;

/**
 * Creates and initializes a new SQLite database instance with the full schema.
 * @param path - File path or ':memory:' for an in-memory database.
 * @returns Initialized Database instance.
 */
export function createDatabase(path: string): Database.Database {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}
