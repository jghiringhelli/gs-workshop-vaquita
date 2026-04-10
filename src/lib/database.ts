import Database from "better-sqlite3";

export const createDatabase = (databasePath: string): Database.Database => {
  const db = new Database(databasePath);
  db.pragma("foreign_keys = ON");

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
      contribution_amount INTEGER NOT NULL,
      status TEXT NOT NULL,
      current_round INTEGER NOT NULL DEFAULT 0,
      total_rounds INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tanda_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      rotation_position INTEGER,
      joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, tanda_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (tanda_id) REFERENCES tandas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanda_id INTEGER NOT NULL,
      participant_id INTEGER NOT NULL,
      round INTEGER NOT NULL,
      amount INTEGER NOT NULL DEFAULT 0,
      penalty_amount INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      paid_at TEXT,
      UNIQUE (tanda_id, participant_id, round),
      FOREIGN KEY (tanda_id) REFERENCES tandas(id) ON DELETE CASCADE,
      FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_participants_tanda_id ON participants(tanda_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_tanda_round ON contributions(tanda_id, round);
  `);

  return db;
};
