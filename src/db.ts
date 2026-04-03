import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.resolve(process.env.DATABASE_URL?.replace('file:', '') ?? './dev.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tandas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    organizer_id TEXT NOT NULL REFERENCES users(id),
    contribution_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'forming',
    current_round INTEGER NOT NULL DEFAULT 0,
    total_rounds INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    tanda_id TEXT NOT NULL REFERENCES tandas(id),
    role TEXT NOT NULL DEFAULT 'member',
    rotation_position INTEGER,
    UNIQUE(user_id, tanda_id)
  );

  CREATE TABLE IF NOT EXISTS contributions (
    id TEXT PRIMARY KEY,
    tanda_id TEXT NOT NULL REFERENCES tandas(id),
    participant_id TEXT NOT NULL REFERENCES participants(id),
    round INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export default db;
