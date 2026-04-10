import Database from 'better-sqlite3';

let db: Database.Database;

function initializeDatabase(path?: string): Database.Database {
  const dbPath = path || process.env.DATABASE_PATH || './tanda.db';
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      organizerId INTEGER NOT NULL REFERENCES users(id),
      contributionAmount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'forming',
      currentRound INTEGER NOT NULL DEFAULT 0,
      totalRounds INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL REFERENCES users(id),
      tandaId INTEGER NOT NULL REFERENCES tandas(id),
      role TEXT NOT NULL DEFAULT 'member',
      rotationPosition INTEGER,
      isDefaulter INTEGER NOT NULL DEFAULT 0,
      UNIQUE(userId, tandaId)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tandaId INTEGER NOT NULL REFERENCES tandas(id),
      participantId INTEGER NOT NULL REFERENCES participants(id),
      round INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      paidAt TEXT,
      UNIQUE(participantId, round)
    );
  `);

  return db;
}

function resetDatabase(): void {
  db.exec(`
    DROP TABLE IF EXISTS contributions;
    DROP TABLE IF EXISTS participants;
    DROP TABLE IF EXISTS tandas;
    DROP TABLE IF EXISTS users;
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      organizerId INTEGER NOT NULL REFERENCES users(id),
      contributionAmount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'forming',
      currentRound INTEGER NOT NULL DEFAULT 0,
      totalRounds INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL REFERENCES users(id),
      tandaId INTEGER NOT NULL REFERENCES tandas(id),
      role TEXT NOT NULL DEFAULT 'member',
      rotationPosition INTEGER,
      isDefaulter INTEGER NOT NULL DEFAULT 0,
      UNIQUE(userId, tandaId)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tandaId INTEGER NOT NULL REFERENCES tandas(id),
      participantId INTEGER NOT NULL REFERENCES participants(id),
      round INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      paidAt TEXT,
      UNIQUE(participantId, round)
    );
  `);
}

// Initialize singleton at module load
initializeDatabase(process.env.DATABASE_PATH || './tanda.db');

export { db, initializeDatabase, resetDatabase };
