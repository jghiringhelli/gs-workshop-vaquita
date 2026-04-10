/**
 * Database Initialization and Connection
 * SQLite via better-sqlite3
 */

import Database from 'better-sqlite3';
import { config } from '../config/index.js';

let db: Database.Database | null = null;

/**
 * Initialize and return the database connection
 */
export function initializeDatabase(): Database.Database {
  if (db) {
    return db;
  }

  db = new Database(config.database.path);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Create tables
  createTables(db);
  
  return db;
}

/**
 * Get the database connection
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Create all necessary tables
 */
function createTables(db: Database.Database): void {
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
      contribution_amount INTEGER NOT NULL,
      status TEXT DEFAULT 'forming',
      current_round INTEGER DEFAULT 0,
      total_rounds INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    -- Participants table
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tanda_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      rotation_position INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, tanda_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (tanda_id) REFERENCES tandas(id) ON DELETE CASCADE
    );

    -- Contributions table
    CREATE TABLE IF NOT EXISTS contributions (
      id TEXT PRIMARY KEY,
      tanda_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      round INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tanda_id, participant_id, round),
      FOREIGN KEY (tanda_id) REFERENCES tandas(id) ON DELETE CASCADE,
      FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE RESTRICT
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_tandas_organizer_id ON tandas(organizer_id);
    CREATE INDEX IF NOT EXISTS idx_tandas_status ON tandas(status);
    CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_participants_tanda_id ON participants(tanda_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_tanda_id ON contributions(tanda_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_participant_id ON contributions(participant_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_round ON contributions(tanda_id, round);
  `);
}
