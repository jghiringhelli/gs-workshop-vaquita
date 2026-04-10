import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { env } from "../config/env";
import { migrationStatements, schemaStatements } from "./schema";

const databasePath = resolve(env.DATABASE_PATH);
mkdirSync(dirname(databasePath), { recursive: true });

export const db: Database.Database = new Database(databasePath);
db.pragma("foreign_keys = ON");

for (const statement of schemaStatements) {
  db.exec(statement);
}

for (const statement of migrationStatements) {
  try {
    db.exec(statement);
  } catch (error) {
    if (!(error instanceof Database.SqliteError) || !error.message.includes("duplicate column name")) {
      throw error;
    }
  }
}

export function runInTransaction<T>(callback: () => T): T {
  const transaction = db.transaction(callback);
  return transaction();
}

export function getDatabasePath(): string {
  return databasePath;
}