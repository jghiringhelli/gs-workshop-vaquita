import Database from 'better-sqlite3';
import path from 'path';

let _db: Database.Database | null = null;

function initSchema(db: Database.Database): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      name               TEXT NOT NULL,
      organizerId        INTEGER NOT NULL,
      contributionAmount REAL NOT NULL,
      status             TEXT NOT NULL DEFAULT 'forming',
      currentRound       INTEGER NOT NULL DEFAULT 1,
      totalRounds        INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (organizerId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS participants (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      userId           INTEGER NOT NULL,
      tandaId          INTEGER NOT NULL,
      role             TEXT NOT NULL DEFAULT 'member',
      rotationPosition INTEGER,
      isDefaulter      INTEGER NOT NULL DEFAULT 0,
      UNIQUE (userId, tandaId),
      FOREIGN KEY (userId)  REFERENCES users(id),
      FOREIGN KEY (tandaId) REFERENCES tandas(id)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      tandaId       INTEGER NOT NULL,
      participantId INTEGER NOT NULL,
      round         INTEGER NOT NULL,
      amount        REAL NOT NULL,
      status        TEXT NOT NULL DEFAULT 'pending',
      UNIQUE (participantId, round),
      FOREIGN KEY (tandaId)       REFERENCES tandas(id),
      FOREIGN KEY (participantId) REFERENCES participants(id)
    );
  `);
}

export function getDb(): Database.Database {
  if (!_db) {
    const isTest = process.env.NODE_ENV === 'test';
    const dbPath =
      process.env.DB_PATH ??
      (isTest ? ':memory:' : path.join(process.cwd(), 'tanda.db'));
    _db = new Database(dbPath);
    initSchema(_db);
  }
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
