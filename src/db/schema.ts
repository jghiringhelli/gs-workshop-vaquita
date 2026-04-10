import type Database from 'better-sqlite3';

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      organizer_id INTEGER NOT NULL REFERENCES users(id),
      contribution_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'forming',
      current_round INTEGER NOT NULL DEFAULT 0,
      total_rounds INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      tanda_id INTEGER NOT NULL REFERENCES tandas(id),
      role TEXT NOT NULL DEFAULT 'member',
      rotation_position INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, tanda_id)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanda_id INTEGER NOT NULL REFERENCES tandas(id),
      participant_id INTEGER NOT NULL REFERENCES participants(id),
      round INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tanda_id, participant_id, round)
    );
  `);
}
