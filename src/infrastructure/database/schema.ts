import type Database from "better-sqlite3";

const schemaStatements = `
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
  current_round INTEGER NOT NULL DEFAULT 0,
  total_rounds INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  tanda_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('organizer', 'member')),
  rotation_position INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, tanda_id),
  UNIQUE (tanda_id, rotation_position),
  FOREIGN KEY (user_id) REFERENCES users (id),
  FOREIGN KEY (tanda_id) REFERENCES tandas (id)
);

CREATE TABLE IF NOT EXISTS contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tanda_id INTEGER NOT NULL,
  participant_id INTEGER NOT NULL,
  round INTEGER NOT NULL CHECK (round > 0),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  penalty_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'late', 'missed')),
  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (participant_id, round),
  FOREIGN KEY (tanda_id) REFERENCES tandas (id),
  FOREIGN KEY (participant_id) REFERENCES participants (id)
);

CREATE INDEX IF NOT EXISTS idx_tandas_organizer_id ON tandas (organizer_id);
CREATE INDEX IF NOT EXISTS idx_participants_tanda_id ON participants (tanda_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants (user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_tanda_round ON contributions (tanda_id, round);
CREATE INDEX IF NOT EXISTS idx_contributions_participant_id ON contributions (participant_id);
`;

/**
 * Ensures the base SQLite schema exists before serving requests.
 * @param database SQLite database client.
 * @returns Nothing.
 */
export function initializeDatabaseSchema(database: Database.Database): void {
  database.exec(schemaStatements);
}