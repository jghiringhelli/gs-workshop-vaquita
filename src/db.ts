import Database from 'better-sqlite3';

export type DB = Database.Database;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id   TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tandas (
    id                 TEXT PRIMARY KEY,
    name               TEXT NOT NULL,
    organizerId        TEXT NOT NULL,
    contributionAmount REAL NOT NULL,
    status             TEXT NOT NULL DEFAULT 'forming',
    currentRound       INTEGER NOT NULL DEFAULT 0,
    totalRounds        INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (organizerId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS participants (
    id               TEXT PRIMARY KEY,
    userId           TEXT NOT NULL,
    tandaId          TEXT NOT NULL,
    role             TEXT NOT NULL DEFAULT 'member',
    rotationPosition INTEGER,
    isDefaulter      INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (userId)  REFERENCES users(id),
    FOREIGN KEY (tandaId) REFERENCES tandas(id),
    UNIQUE (userId, tandaId)
  );

  CREATE TABLE IF NOT EXISTS contributions (
    id            TEXT PRIMARY KEY,
    tandaId       TEXT NOT NULL,
    participantId TEXT NOT NULL,
    round         INTEGER NOT NULL,
    amount        REAL NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',
    FOREIGN KEY (tandaId)       REFERENCES tandas(id),
    FOREIGN KEY (participantId) REFERENCES participants(id),
    UNIQUE (participantId, round)
  );
`;

let _db: DB | null = null;

/**
 * Creates and migrates a new SQLite database.
 * @param path - File path or ':memory:' for tests.
 * @returns Configured DB instance
 */
export function createDb(path = process.env.DATABASE_URL ?? 'tanda.db'): DB {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

/** Returns the module-level singleton DB, creating it on first call. */
export function getDb(): DB {
  if (!_db) _db = createDb();
  return _db;
}

/** Replaces the singleton — used in tests to inject an in-memory DB. */
export function setDb(db: DB): void {
  _db = db;
}
