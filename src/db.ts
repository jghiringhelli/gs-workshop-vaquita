import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') || './dev.db';
const db = new sqlite3.Database(DB_PATH);

// Promisify db methods
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

export { db, dbRun, dbGet, dbAll };

export async function initializeDatabase() {
  // Create tables
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS tandas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      organizer_id TEXT NOT NULL,
      contribution_amount INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('forming', 'active', 'completed', 'cancelled')),
      current_round INTEGER DEFAULT 0,
      total_rounds INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    );
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tanda_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('organizer', 'member')),
      rotation_position INTEGER,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (tanda_id) REFERENCES tandas(id),
      UNIQUE(user_id, tanda_id)
    );
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS contributions (
      id TEXT PRIMARY KEY,
      tanda_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      round INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'late', 'missed')),
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tanda_id) REFERENCES tandas(id),
      FOREIGN KEY (participant_id) REFERENCES participants(id),
      UNIQUE(tanda_id, participant_id, round)
    );
  `);
}