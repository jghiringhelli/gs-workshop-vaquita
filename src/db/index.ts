import Database from 'better-sqlite3';
import { env } from '../config/env';

let _db: Database.Database | null = null;

/**
 * Returns the shared database instance, creating and initialising it on first call.
 * The database path is controlled by DATABASE_PATH env var:
 *   - production/dev: a file path (e.g., './data.db')
 *   - tests: ':memory:' (new in-memory DB per worker process)
 *
 * @returns Initialised better-sqlite3 Database instance.
 */
export function getDb(): Database.Database {
  if (_db === null) {
    _db = new Database(env.DATABASE_PATH);
    // WAL mode improves concurrent read performance.
    _db.pragma('journal_mode = WAL');
    // Enforce foreign key constraints at the SQLite level.
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

/**
 * Closes and destroys the current DB instance.
 * Primarily used in tests to reset state between test files.
 */
export function closeDb(): void {
  if (_db !== null) {
    _db.close();
    _db = null;
  }
}

/**
 * Truncates all application tables in dependency order.
 * Used in tests to reset state between test cases.
 */
export function clearAllTables(): void {
  const db = getDb();
  db.exec(`
    DELETE FROM contributions;
    DELETE FROM participants;
    DELETE FROM tandas;
    DELETE FROM users;
  `);
}

/**
 * Runs all CREATE TABLE IF NOT EXISTS and index statements.
 * Called once per DB connection, safe to call multiple times.
 *
 * @param db - The database instance to initialise.
 */
function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id   TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id                 TEXT PRIMARY KEY,
      name               TEXT NOT NULL,
      organizerId        TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      -- contributionAmount stored as REAL (major monetary units, e.g. 100.00 = $100).
      -- NOTE: amounts are whole-number contributions in practice, avoiding float precision issues.
      contributionAmount REAL NOT NULL,
      status             TEXT NOT NULL DEFAULT 'forming'
                           CHECK (status IN ('forming', 'active', 'completed', 'cancelled')),
      currentRound       INTEGER NOT NULL DEFAULT 1,
      totalRounds        INTEGER NOT NULL DEFAULT 0,
      -- roundStartedAt: ISO-8601 string. Set when status → active and on each advance.
      -- Used to compute the contribution window (ROUND_WINDOW_HOURS).
      roundStartedAt     TEXT
    );

    CREATE TABLE IF NOT EXISTS participants (
      id               TEXT PRIMARY KEY,
      userId           TEXT NOT NULL REFERENCES users(id)  ON DELETE RESTRICT,
      tandaId          TEXT NOT NULL REFERENCES tandas(id) ON DELETE RESTRICT,
      role             TEXT NOT NULL DEFAULT 'member'
                         CHECK (role IN ('organizer', 'member')),
      -- rotationPosition: NULL while forming; set to 1..N (randomised) when tanda starts.
      rotationPosition INTEGER,
      UNIQUE(userId, tandaId)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id            TEXT PRIMARY KEY,
      tandaId       TEXT NOT NULL REFERENCES tandas(id)       ON DELETE RESTRICT,
      participantId TEXT NOT NULL REFERENCES participants(id) ON DELETE RESTRICT,
      round         INTEGER NOT NULL,
      -- amount stored as REAL (same unit as contributionAmount).
      amount        REAL NOT NULL,
      status        TEXT NOT NULL
                      CHECK (status IN ('pending', 'paid', 'late', 'missed')),
      UNIQUE(participantId, round)
    );

    CREATE INDEX IF NOT EXISTS idx_tandas_organizerId
      ON tandas(organizerId);
    CREATE INDEX IF NOT EXISTS idx_participants_tandaId
      ON participants(tandaId);
    CREATE INDEX IF NOT EXISTS idx_participants_userId
      ON participants(userId);
    CREATE INDEX IF NOT EXISTS idx_contributions_tandaId
      ON contributions(tandaId);
    CREATE INDEX IF NOT EXISTS idx_contributions_participantId
      ON contributions(participantId);
    CREATE INDEX IF NOT EXISTS idx_contributions_round
      ON contributions(round);
  `);
}
