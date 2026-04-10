import Database from 'better-sqlite3';
import path from 'path';

export function createDatabase(dbPath = ':memory:'): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      organizerId TEXT NOT NULL,
      contributionAmount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'forming',
      currentRound INTEGER NOT NULL DEFAULT 0,
      totalRounds INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (organizerId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      tandaId TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      rotationPosition INTEGER,
      isDefaulter INTEGER NOT NULL DEFAULT 0,
      consecutiveMissed INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      UNIQUE(userId, tandaId),
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (tandaId) REFERENCES tandas(id)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id TEXT PRIMARY KEY,
      tandaId TEXT NOT NULL,
      participantId TEXT NOT NULL,
      round INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL,
      FOREIGN KEY (tandaId) REFERENCES tandas(id),
      FOREIGN KEY (participantId) REFERENCES participants(id)
    );
  `);
}

let _db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!_db) {
    const url = process.env.DATABASE_URL ?? './dev.db';
    const dbPath = url.startsWith('file:') ? url.slice(5) : url;
    _db = createDatabase(path.resolve(dbPath));
  }
  return _db;
}

export function setDatabase(db: Database.Database): void {
  _db = db;
}

export function resetDatabase(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
