import Database from 'better-sqlite3';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema();
  }
  return db;
}

export function initializeDatabase(dbPath?: string): void {
  if (db) {
    db.close();
  }
  db = new Database(dbPath ?? ':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initializeSchema();
}

function initializeSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      organizer_id INTEGER NOT NULL,
      contribution_amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'forming',
      current_round INTEGER NOT NULL DEFAULT 0,
      total_rounds INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tanda_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      rotation_position INTEGER,
      is_defaulter INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (tanda_id) REFERENCES tandas(id),
      UNIQUE(user_id, tanda_id)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanda_id INTEGER NOT NULL,
      participant_id INTEGER NOT NULL,
      round INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      FOREIGN KEY (tanda_id) REFERENCES tandas(id),
      FOREIGN KEY (participant_id) REFERENCES participants(id)
    );

    CREATE INDEX IF NOT EXISTS idx_contributions_tanda_round ON contributions(tanda_id, round);
    CREATE INDEX IF NOT EXISTS idx_participants_tanda ON participants(tanda_id);
  `);
}

export function resetDatabase(): void {
  if (db) {
    db.exec(`
      DELETE FROM contributions;
      DELETE FROM participants;
      DELETE FROM tandas;
      DELETE FROM users;
    `);
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}
