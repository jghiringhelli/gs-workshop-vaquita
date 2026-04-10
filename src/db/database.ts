import Database from "better-sqlite3";

let connection: Database.Database | null = null;

function resolveDatabasePath(): string {
  const rawUrl = process.env.DATABASE_URL;

  if (!rawUrl || rawUrl.trim().length === 0) {
    return process.env.NODE_ENV === "test" ? ":memory:" : "./dev.db";
  }

  const normalized = rawUrl.trim().replace(/^"|"$/g, "");

  if (normalized.startsWith("file:")) {
    return normalized.replace("file:", "");
  }

  return normalized;
}

export function getDatabase(): Database.Database {
  if (!connection) {
    connection = new Database(resolveDatabasePath());
    connection.pragma("foreign_keys = ON");
    connection.pragma("journal_mode = WAL");
  }

  return connection;
}

export function runInTransaction<T>(operation: () => T): T {
  const db = getDatabase();
  const tx = db.transaction(operation);
  return tx();
}
