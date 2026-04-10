import Database, { Database as DatabaseType } from 'better-sqlite3';

const DB_PATH =
  process.env['NODE_ENV'] === 'test'
    ? ':memory:'
    : (process.env['DB_PATH'] ?? './tanda.db');

export const db: DatabaseType = new Database(DB_PATH);

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
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    tandaId TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    rotationPosition INTEGER,
    consecutiveMisses INTEGER NOT NULL DEFAULT 0,
    isDefaulter INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contributions (
    id TEXT PRIMARY KEY,
    tandaId TEXT NOT NULL,
    participantId TEXT NOT NULL,
    round INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    createdAt TEXT NOT NULL
  );
`);

/**
 * Deletes all rows from every table. Used in tests to reset state between cases.
 * @returns void
 */
export function clearAllTables(): void {
  db.exec(
    'DELETE FROM contributions; DELETE FROM participants; DELETE FROM tandas; DELETE FROM users;',
  );
}
