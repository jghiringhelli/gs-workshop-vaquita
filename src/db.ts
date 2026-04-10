import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST;
const dbPath = isTest ? ':memory:' : (process.env.DB_PATH || path.join(__dirname, '..', 'tanda.db'));

const db: DatabaseType = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tandas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    organizer_id INTEGER NOT NULL REFERENCES users(id),
    contribution_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'forming' CHECK(status IN ('forming','active','completed','cancelled')),
    current_round INTEGER NOT NULL DEFAULT 0,
    total_rounds INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    tanda_id INTEGER NOT NULL REFERENCES tandas(id),
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('organizer','member')),
    rotation_position INTEGER,
    UNIQUE(user_id, tanda_id)
  );

  CREATE TABLE IF NOT EXISTS contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanda_id INTEGER NOT NULL REFERENCES tandas(id),
    participant_id INTEGER NOT NULL REFERENCES participants(id),
    round INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','late','missed')),
    UNIQUE(participant_id, round)
  );
`);

export default db;
