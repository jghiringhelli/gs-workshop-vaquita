import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : (process.env.DB_PATH || path.join(__dirname, '..', 'tanda.db'));

const db: DatabaseType = new Database(dbPath);

if (process.env.NODE_ENV !== 'test') {
  db.pragma('journal_mode = WAL');
}
db.pragma('foreign_keys = ON');

export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tandas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      organizerId INTEGER NOT NULL REFERENCES users(id),
      contributionAmount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'forming',
      currentRound INTEGER NOT NULL DEFAULT 0,
      totalRounds INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL REFERENCES users(id),
      tandaId INTEGER NOT NULL REFERENCES tandas(id),
      role TEXT NOT NULL,
      rotationPosition INTEGER,
      UNIQUE(userId, tandaId)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tandaId INTEGER NOT NULL REFERENCES tandas(id),
      participantId INTEGER NOT NULL REFERENCES participants(id),
      round INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      UNIQUE(participantId, round)
    );
  `);
}

export function resetDb(): void {
  db.exec('DELETE FROM contributions');
  db.exec('DELETE FROM participants');
  db.exec('DELETE FROM tandas');
  db.exec('DELETE FROM users');
}

initDb();

export default db;
