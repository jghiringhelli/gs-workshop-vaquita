import Database from 'better-sqlite3';

let db: Database.Database | null = null;

/**
 * Returns a singleton better-sqlite3 Database instance.
 * Reads DB_PATH from the environment at call time so tests can override it.
 * Call `closeDatabase()` in tests to reset between suites.
 */
export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = process.env['DB_PATH'] ?? 'tanda.db';
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

/** Close and clear the singleton — used in tests. */
export function closeDatabase(): void {
  db?.close();
  db = null;
}
