import Database from 'better-sqlite3';
import { config } from '../config';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(config.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function resetDb(): void {
  closeDb();
  getDb();
}

function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      organizerId TEXT NOT NULL,
      contributionAmount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'forming',
      currentRound INTEGER NOT NULL DEFAULT 0,
      totalRounds INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
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
      joinedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (tandaId) REFERENCES tandas(id),
      UNIQUE(userId, tandaId)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id TEXT PRIMARY KEY,
      tandaId TEXT NOT NULL,
      participantId TEXT NOT NULL,
      round INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tandaId) REFERENCES tandas(id),
      FOREIGN KEY (participantId) REFERENCES participants(id)
    );
  `);
}
