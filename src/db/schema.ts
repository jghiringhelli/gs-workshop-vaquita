import Database from 'better-sqlite3';
import path from 'path';

export function initializeDatabase(): Database.Database {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'tanda.db');
  const db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      organizer_id TEXT NOT NULL,
      contribution_amount REAL NOT NULL,
      status TEXT DEFAULT 'forming' CHECK (status IN ('forming', 'active', 'completed', 'cancelled')),
      current_round INTEGER DEFAULT 0,
      total_rounds INTEGER NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tanda_id TEXT NOT NULL,
      role TEXT DEFAULT 'member' CHECK (role IN ('organizer', 'member')),
      rotation_position INTEGER,
      consecutive_missed INTEGER DEFAULT 0,
      is_defaulter INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, tanda_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (tanda_id) REFERENCES tandas(id)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id TEXT PRIMARY KEY,
      tanda_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      round INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late', 'missed')),
      penalty_applied REAL DEFAULT 0,
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (tanda_id, participant_id, round),
      FOREIGN KEY (tanda_id) REFERENCES tandas(id),
      FOREIGN KEY (participant_id) REFERENCES participants(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tandas_organizer ON tandas(organizer_id);
    CREATE INDEX IF NOT EXISTS idx_participants_tanda ON participants(tanda_id);
    CREATE INDEX IF NOT EXISTS idx_participants_user ON participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_tanda ON contributions(tanda_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_participant ON contributions(participant_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_round ON contributions(tanda_id, round);
  `);

  return db;
}
