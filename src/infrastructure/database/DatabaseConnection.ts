import Database from "better-sqlite3";

import { initializeSchema } from "./schema";

/**
 * Own the lifecycle of the SQLite connection used by the application.
 */
export class DatabaseConnection {
  public readonly database: Database.Database;

  public constructor(databasePath: string) {
    this.database = new Database(databasePath);
    this.database.pragma("foreign_keys = ON");
    initializeSchema(this.database);
  }

  /**
   * Close the active database connection.
   *
   * @returns Nothing.
   */
  public close(): void {
    this.database.close();
  }
}
