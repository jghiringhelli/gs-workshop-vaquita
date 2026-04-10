import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import Database from "better-sqlite3";

import type { AppConfig } from "../../config/env";

export interface DatabaseConnection {
  readonly client: Database.Database;
  close(): void;
}

/**
 * Creates the SQLite connection used by the application.
 * @param config Runtime application configuration.
 * @returns Database connection wrapper.
 */
export function createDatabaseConnection(config: AppConfig): DatabaseConnection {
  const normalizedPath = normalizeDatabasePath(config.databasePath);
  const database = new Database(normalizedPath);

  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = WAL");

  return {
    client: database,
    close(): void {
      database.close();
    },
  };
}

function normalizeDatabasePath(databasePath: string): string {
  if (databasePath === ":memory:") {
    return databasePath;
  }

  const absoluteDatabasePath = resolve(databasePath);
  mkdirSync(dirname(absoluteDatabasePath), { recursive: true });
  return absoluteDatabasePath;
}