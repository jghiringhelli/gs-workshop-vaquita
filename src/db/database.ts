import Database from 'better-sqlite3';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tandas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  organizer_id TEXT NOT NULL REFERENCES users(id),
  contribution_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'forming',
  current_round INTEGER NOT NULL DEFAULT 1,
  total_rounds INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  tanda_id TEXT NOT NULL REFERENCES tandas(id),
  role TEXT NOT NULL DEFAULT 'member',
  rotation_position INTEGER,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, tanda_id)
);

CREATE TABLE IF NOT EXISTS contributions (
  id TEXT PRIMARY KEY,
  tanda_id TEXT NOT NULL REFERENCES tandas(id),
  participant_id TEXT NOT NULL REFERENCES participants(id),
  round INTEGER NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(participant_id, round)
);
`;

export function createDatabase(path: string): Database.Database {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}
