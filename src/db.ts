import Database from "better-sqlite3";
import path from "path";
import { config } from "./config";

/**
 * Initialize SQLite database and create schema
 */

let db: Database.Database | null = null;

export function initializeDatabase(): Database.Database {
  if (db) return db;

  const dbPath = config.database.url.replace("file:", "");
  db = new Database(dbPath);

  // Enable foreign keys
  db.pragma("foreign_keys = ON");

  // Drop old tables if they exist (for schema upgrades)
  try {
    db.exec(`
      DROP TABLE IF EXISTS contributions;
      DROP TABLE IF EXISTS participants;
      DROP TABLE IF EXISTS tandas;
      DROP TABLE IF EXISTS users;
    `);
  } catch (e) {
    // Ignore errors
  }

  // Create tables
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Tandas table
    CREATE TABLE IF NOT EXISTS tandas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      organizer_id TEXT NOT NULL,
      contribution_amount REAL NOT NULL CHECK (contribution_amount > 0),
      status TEXT NOT NULL DEFAULT 'forming',
      current_round INTEGER NOT NULL DEFAULT 1,
      total_rounds INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
      CHECK (status IN ('forming', 'active', 'completed', 'cancelled'))
    );

    -- Participants table
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tanda_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      rotation_position INTEGER,
      is_defaulter INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (tanda_id) REFERENCES tandas(id) ON DELETE CASCADE,
      CHECK (role IN ('organizer', 'member')),
      UNIQUE (user_id, tanda_id)
    );

    -- Contributions table
    CREATE TABLE IF NOT EXISTS contributions (
      id TEXT PRIMARY KEY,
      tanda_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      round INTEGER NOT NULL,
      amount REAL NOT NULL CHECK (amount >= 0),
      status TEXT NOT NULL DEFAULT 'pending',
      paid_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tanda_id) REFERENCES tandas(id) ON DELETE CASCADE,
      FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
      CHECK (status IN ('pending', 'paid', 'late', 'missed')),
      UNIQUE (tanda_id, participant_id, round)
    );

    -- Create indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_tandas_organizer ON tandas(organizer_id);
    CREATE INDEX IF NOT EXISTS idx_participants_user ON participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_participants_tanda ON participants(tanda_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_tanda ON contributions(tanda_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_participant ON contributions(participant_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_round ON contributions(tanda_id, round);
  `);

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
