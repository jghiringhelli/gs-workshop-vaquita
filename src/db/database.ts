import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") ?? path.join(process.cwd(), "dev.db");

let _db: Database.Database | null = null;

/**
 * Returns the singleton SQLite connection.
 * @returns {Database.Database}
 */
export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
  }
  return _db;
}

/**
 * Closes and resets the connection — for testing only.
 */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/**
 * Executes `fn` inside a single SQLite transaction.
 * @param fn function to run inside the transaction
 * @returns result of fn
 */
export function runInTransaction<T>(fn: () => T): T {
  return getDb().transaction(fn)();
}
