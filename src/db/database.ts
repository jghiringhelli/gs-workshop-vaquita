import Database, { type Database as DatabaseType } from "better-sqlite3";
import path from "path";

const isTest = process.env.NODE_ENV === "test";

const dbPath = isTest ? ":memory:" : path.resolve(process.cwd(), "dev.db");

export const db: DatabaseType = new Database(dbPath);

// WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id   TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tandas (
    id                 TEXT PRIMARY KEY,
    name               TEXT NOT NULL,
    organizerId        TEXT NOT NULL,
    contributionAmount REAL NOT NULL,
    status             TEXT NOT NULL DEFAULT 'forming'
                         CHECK(status IN ('forming','active','completed','cancelled')),
    currentRound       INTEGER NOT NULL DEFAULT 0,
    totalRounds        INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (organizerId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS participants (
    id               TEXT PRIMARY KEY,
    userId           TEXT NOT NULL,
    tandaId          TEXT NOT NULL,
    role             TEXT NOT NULL DEFAULT 'member'
                       CHECK(role IN ('organizer','member')),
    rotationPosition INTEGER,
    isDefaulter      INTEGER NOT NULL DEFAULT 0,
    UNIQUE(userId, tandaId),
    FOREIGN KEY (userId)  REFERENCES users(id),
    FOREIGN KEY (tandaId) REFERENCES tandas(id)
  );

  CREATE TABLE IF NOT EXISTS contributions (
    id            TEXT PRIMARY KEY,
    tandaId       TEXT NOT NULL,
    participantId TEXT NOT NULL,
    round         INTEGER NOT NULL,
    amount        REAL NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending','paid','late','missed')),
    FOREIGN KEY (tandaId)       REFERENCES tandas(id),
    FOREIGN KEY (participantId) REFERENCES participants(id)
  );
`);

export default db;
