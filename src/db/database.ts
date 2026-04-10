import Database from "better-sqlite3";

export type DatabaseConnection = Database.Database;

export function resolveDatabaseFilename(databaseUrl: string): string {
  if (databaseUrl.startsWith("file:")) {
    return databaseUrl.slice("file:".length);
  }

  return databaseUrl;
}

export function connectDatabase(databaseUrl: string): DatabaseConnection {
  const filename = resolveDatabaseFilename(databaseUrl);
  const db = new Database(filename);

  db.pragma("foreign_keys = ON");

  return db;
}
