import Database from 'better-sqlite3';
import { config } from '../config';

/**
 * Initialize SQLite database and create schema
 */
export function initializeDatabase(): Database.Database {
  const db = new Database(config.dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables if they don't exist
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tandas table
    CREATE TABLE IF NOT EXISTS tandas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      organizer_id TEXT NOT NULL,
      contribution_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'forming',
      current_round INTEGER NOT NULL DEFAULT 1,
      total_rounds INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    );

    -- Participants table
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tanda_id TEXT NOT NULL,
      role TEXT NOT NULL,
      rotation_position INTEGER,
      has_received_payout INTEGER NOT NULL DEFAULT 0,
      missed_consecutive INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (tanda_id) REFERENCES tandas(id),
      UNIQUE(user_id, tanda_id)
    );

    -- Contributions table
    CREATE TABLE IF NOT EXISTS contributions (
      id TEXT PRIMARY KEY,
      tanda_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      round INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tanda_id) REFERENCES tandas(id),
      FOREIGN KEY (participant_id) REFERENCES participants(id),
      UNIQUE(tanda_id, participant_id, round)
    );

    -- Rounds table
    CREATE TABLE IF NOT EXISTS rounds (
      id TEXT PRIMARY KEY,
      tanda_id TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      recipient_user_id TEXT,
      total_collected REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      FOREIGN KEY (tanda_id) REFERENCES tandas(id),
      FOREIGN KEY (recipient_user_id) REFERENCES users(id),
      UNIQUE(tanda_id, round_number)
    );

    -- Create indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_participants_tanda_id ON participants(tanda_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_tanda_id ON contributions(tanda_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_round ON contributions(tanda_id, round);
    CREATE INDEX IF NOT EXISTS idx_tandas_organizer ON tandas(organizer_id);
  `);

  return db;
}

/**
 * Get or create database singleton
 */
let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    dbInstance = initializeDatabase();
  }
  return dbInstance;
}
