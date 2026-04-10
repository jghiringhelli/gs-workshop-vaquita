import Database from "better-sqlite3";
import path from "path";
import { config } from "../config/index.js";

let instance: Database.Database | null = null;

/**
 * Returns the singleton SQLite database connection.
 * Creates it on first call with WAL journal mode enabled.
 * @returns The shared Database instance.
 */
export function getDatabase(): Database.Database {
  if (instance) return instance;

  const filePath = config.DATABASE_URL.replace("file:", "");
  const resolved = path.resolve(filePath);

  instance = new Database(resolved);
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");

  return instance;
}

/**
 * Closes the database connection and resets the singleton.
 * Used in tests to ensure a clean state between runs.
 */
export function closeDatabase(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}
