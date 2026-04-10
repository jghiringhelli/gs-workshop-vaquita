import type Database from "better-sqlite3";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tandas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  organizer_user_id INTEGER NOT NULL,
  contribution_amount INTEGER NOT NULL CHECK (contribution_amount > 0),
  status TEXT NOT NULL CHECK (status IN ('forming', 'active', 'completed', 'cancelled')),
  current_round INTEGER NOT NULL DEFAULT 0 CHECK (current_round >= 0),
  total_rounds INTEGER NOT NULL DEFAULT 0 CHECK (total_rounds >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  round_started_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  FOREIGN KEY (organizer_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  tanda_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('organizer', 'member')),
  rotation_position INTEGER,
  is_defaulter INTEGER NOT NULL DEFAULT 0 CHECK (is_defaulter IN (0, 1)),
  joined_at TEXT NOT NULL,
  UNIQUE (user_id, tanda_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tanda_id) REFERENCES tandas(id)
);

CREATE TABLE IF NOT EXISTS contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tanda_id INTEGER NOT NULL,
  participant_id INTEGER NOT NULL,
  round INTEGER NOT NULL CHECK (round > 0),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL CHECK (status IN ('paid', 'late', 'missed')),
  penalty_amount INTEGER NOT NULL DEFAULT 0 CHECK (penalty_amount >= 0),
  recorded_at TEXT NOT NULL,
  UNIQUE (tanda_id, participant_id, round),
  FOREIGN KEY (tanda_id) REFERENCES tandas(id),
  FOREIGN KEY (participant_id) REFERENCES participants(id)
);

CREATE INDEX IF NOT EXISTS idx_participants_tanda_id ON participants (tanda_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_tanda_rotation
  ON participants (tanda_id, rotation_position)
  WHERE rotation_position IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contributions_round ON contributions (tanda_id, round);
CREATE INDEX IF NOT EXISTS idx_contributions_participant ON contributions (participant_id, round);
`;

/**
 * Initialize the SQLite schema required by the Tanda API.
 *
 * @param database The open better-sqlite3 database connection.
 * @returns Nothing.
 */
export function initializeSchema(database: Database.Database): void {
  database.exec(SCHEMA_SQL);
}
