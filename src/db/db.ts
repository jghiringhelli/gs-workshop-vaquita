import Database from 'better-sqlite3';

export type DB = Database.Database;

/** Inline DDL — also exists as schema.sql for reference. */
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id        TEXT PRIMARY KEY,
    email     TEXT UNIQUE NOT NULL,
    name      TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tandas (
    id                 TEXT PRIMARY KEY,
    name               TEXT NOT NULL,
    organizerId        TEXT NOT NULL REFERENCES users(id),
    contributionAmount REAL NOT NULL,
    status             TEXT NOT NULL DEFAULT 'forming'
                         CHECK(status IN ('forming','active','completed','cancelled')),
    currentRound       INTEGER NOT NULL DEFAULT 0,
    totalRounds        INTEGER NOT NULL DEFAULT 0,
    roundStartedAt     TEXT,
    createdAt          TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt          TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS participants (
    id               TEXT PRIMARY KEY,
    userId           TEXT NOT NULL REFERENCES users(id),
    tandaId          TEXT NOT NULL REFERENCES tandas(id),
    role             TEXT NOT NULL DEFAULT 'member'
                       CHECK(role IN ('organizer','member')),
    rotationPosition INTEGER,
    isDefaulter      INTEGER NOT NULL DEFAULT 0,
    consecutiveMissed INTEGER NOT NULL DEFAULT 0,
    joinedAt         TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(userId, tandaId)
  );

  CREATE TABLE IF NOT EXISTS contributions (
    id            TEXT PRIMARY KEY,
    tandaId       TEXT NOT NULL REFERENCES tandas(id),
    participantId TEXT NOT NULL REFERENCES participants(id),
    round         INTEGER NOT NULL,
    amount        REAL NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending','paid','late','missed')),
    dueAt         TEXT,
    paidAt        TEXT,
    createdAt     TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(participantId, round)
  );
`;

export function createDb(path: string): DB {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);
  return db;
}
