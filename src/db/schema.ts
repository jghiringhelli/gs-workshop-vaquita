import { type DatabaseConnection } from "./database";

export function initializeSchema(db: DatabaseConnection): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      organizer_id INTEGER NOT NULL,
      contribution_amount INTEGER NOT NULL CHECK (contribution_amount > 0),
      status TEXT NOT NULL CHECK (status IN ('forming', 'active', 'completed', 'cancelled')),
      current_round INTEGER NOT NULL DEFAULT 0 CHECK (current_round >= 0),
      total_rounds INTEGER NOT NULL DEFAULT 1 CHECK (total_rounds >= 0),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tanda_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('organizer', 'member')),
      rotation_position INTEGER,
      joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (tanda_id) REFERENCES tandas(id) ON DELETE CASCADE,
      UNIQUE (user_id, tanda_id),
      UNIQUE (tanda_id, rotation_position)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanda_id INTEGER NOT NULL,
      participant_id INTEGER NOT NULL,
      round INTEGER NOT NULL CHECK (round > 0),
      amount INTEGER NOT NULL CHECK (amount > 0),
      penalty_amount INTEGER NOT NULL DEFAULT 0 CHECK (penalty_amount >= 0),
      status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'late', 'missed')),
      recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tanda_id) REFERENCES tandas(id) ON DELETE CASCADE,
      FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
      UNIQUE (participant_id, round)
    );

    CREATE INDEX IF NOT EXISTS idx_participants_tanda_id ON participants(tanda_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_tanda_round ON contributions(tanda_id, round);
    CREATE INDEX IF NOT EXISTS idx_contributions_participant_round ON contributions(participant_id, round);
  `);
}
