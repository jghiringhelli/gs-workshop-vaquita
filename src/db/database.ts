import Database from 'better-sqlite3';
import path from 'path';

let _db: Database.Database | null = null;

function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      organizerId INTEGER NOT NULL,
      contributionAmount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'forming',
      currentRound INTEGER NOT NULL DEFAULT 1,
      totalRounds INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (organizerId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      tandaId INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      rotationPosition INTEGER,
      consecutiveMissed INTEGER NOT NULL DEFAULT 0,
      isDefaulter INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (tandaId) REFERENCES tandas(id),
      UNIQUE(userId, tandaId)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tandaId INTEGER NOT NULL,
      participantId INTEGER NOT NULL,
      round INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      paidAt TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tandaId) REFERENCES tandas(id),
      FOREIGN KEY (participantId) REFERENCES participants(id)
    );
  `);
}

function createDb(): Database.Database {
  const isTest = process.env.NODE_ENV === 'test';
  const dbFile = isTest
    ? ':memory:'
    : path.resolve(process.env.DATABASE_URL?.replace('file:', '') ?? './dev.db');
  const db = new Database(dbFile);
  db.pragma('foreign_keys = ON');
  if (!isTest) db.pragma('journal_mode = WAL');
  runMigrations(db);
  return db;
}

export function getDb(): Database.Database {
  if (!_db) _db = createDb();
  return _db;
}

export function closeDb(): void {
  _db?.close();
  _db = null;
}
