import path from "node:path";

import Database from "better-sqlite3";

type DatabaseConnection = import("better-sqlite3").Database;

export function createDatabase(databaseUrl: string): DatabaseConnection {
  const filename = resolveDatabaseFilename(databaseUrl);
  const db = new Database(filename);

  db.pragma("foreign_keys = ON");

  return db;
}

function resolveDatabaseFilename(databaseUrl: string): string {
  if (databaseUrl === ":memory:" || databaseUrl === "file::memory:") {
    return ":memory:";
  }

  if (databaseUrl.startsWith("file:")) {
    const rawPath = databaseUrl.slice("file:".length);

    if (rawPath === ":memory:") {
      return ":memory:";
    }

    return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
  }

  return path.isAbsolute(databaseUrl) ? databaseUrl : path.resolve(process.cwd(), databaseUrl);
}
