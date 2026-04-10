import Database from 'better-sqlite3';

const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tandas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    organizerId INTEGER NOT NULL REFERENCES users(id),
    contributionAmount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'forming',
    currentRound INTEGER NOT NULL DEFAULT 0,
    totalRounds INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES users(id),
    tandaId INTEGER NOT NULL REFERENCES tandas(id),
    role TEXT NOT NULL DEFAULT 'member',
    rotationPosition INTEGER,
    consecutiveMissed INTEGER NOT NULL DEFAULT 0,
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
`;

export function createDatabase(path?: string): Database.Database {
  const db = new Database(path ?? process.env.DATABASE_URL ?? './dev.db');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(schema);
  return db;
}

// No default export - callers must use createDatabase() explicitly
