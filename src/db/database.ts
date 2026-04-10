import Database from "better-sqlite3";

export const db: Database.Database = new Database("tanda.db");

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      organizer_id INTEGER NOT NULL,
      contribution_amount REAL NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('forming', 'active', 'completed', 'cancelled')),
      current_round INTEGER NOT NULL DEFAULT 0,
      total_rounds INTEGER NOT NULL DEFAULT 0,
      started_at TEXT,
      round_started_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tanda_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('organizer', 'member')),
      rotation_position INTEGER,
      UNIQUE(user_id, tanda_id),
      UNIQUE(tanda_id, rotation_position),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (tanda_id) REFERENCES tandas(id)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanda_id INTEGER NOT NULL,
      participant_id INTEGER NOT NULL,
      round INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'paid', 'late', 'missed')),
      created_at TEXT NOT NULL,
      UNIQUE(participant_id, round),
      FOREIGN KEY (tanda_id) REFERENCES tandas(id),
      FOREIGN KEY (participant_id) REFERENCES participants(id)
    );

    CREATE INDEX IF NOT EXISTS idx_participants_tanda_id ON participants(tanda_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_tanda_round ON contributions(tanda_id, round);
    CREATE INDEX IF NOT EXISTS idx_contributions_participant ON contributions(participant_id);
  `);
}
