import Database from 'better-sqlite3';

/**
 * Initialises the SQLite database and runs migrations.
 * @param path - Database file path or ':memory:' for in-memory.
 * @returns Opened database instance.
 */
export function createDatabase(path: string): Database.Database {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      organizer_id TEXT NOT NULL REFERENCES users(id),
      contribution_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'forming',
      current_round INTEGER NOT NULL DEFAULT 0,
      total_rounds INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      tanda_id TEXT NOT NULL REFERENCES tandas(id),
      role TEXT NOT NULL DEFAULT 'member',
      rotation_position INTEGER,
      UNIQUE(user_id, tanda_id)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id TEXT PRIMARY KEY,
      tanda_id TEXT NOT NULL REFERENCES tandas(id),
      participant_id TEXT NOT NULL REFERENCES participants(id),
      round INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      UNIQUE(participant_id, round)
    );
  `);
}
