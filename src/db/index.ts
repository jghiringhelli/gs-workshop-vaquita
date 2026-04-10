import Database from 'better-sqlite3';
import { config } from '../config';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(config.databaseUrl);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    applySchema(db);
  }
  return db;
}

function applySchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      email     TEXT    NOT NULL UNIQUE,
      name      TEXT    NOT NULL,
      createdAt TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      name               TEXT    NOT NULL,
      organizerId        INTEGER NOT NULL,
      contributionAmount INTEGER NOT NULL,
      status             TEXT    NOT NULL DEFAULT 'forming'
                                 CHECK (status IN ('forming','active','completed','cancelled')),
      currentRound       INTEGER NOT NULL DEFAULT 1,
      totalRounds        INTEGER NOT NULL DEFAULT 0,
      createdAt          TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (organizerId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS participants (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      userId           INTEGER NOT NULL,
      tandaId          INTEGER NOT NULL,
      role             TEXT    NOT NULL DEFAULT 'member'
                               CHECK (role IN ('organizer','member')),
      rotationPosition INTEGER,
      createdAt        TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (userId, tandaId),
      FOREIGN KEY (userId)  REFERENCES users(id),
      FOREIGN KEY (tandaId) REFERENCES tandas(id)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      tandaId       INTEGER NOT NULL,
      participantId INTEGER NOT NULL,
      round         INTEGER NOT NULL,
      amount        INTEGER NOT NULL,
      status        TEXT    NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','paid','late','missed')),
      createdAt     TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tandaId)       REFERENCES tandas(id),
      FOREIGN KEY (participantId) REFERENCES participants(id)
    );
  `);
}

/** For tests: create an isolated in-memory database. */
export function createTestDb(): Database.Database {
  const testDb = new Database(':memory:');
  testDb.pragma('journal_mode = WAL');
  testDb.pragma('foreign_keys = ON');
  applySchema(testDb);
  return testDb;
}
