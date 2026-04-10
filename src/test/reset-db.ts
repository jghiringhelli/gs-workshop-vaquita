import { closeDb } from "../db/database";
import { initializeSchema, resetSchemaData } from "../db/schema";

/**
 * Resets all data between tests and ensures schema is ready.
 * Call in beforeEach to guarantee test isolation.
 */
export function resetDb(): void {
  initializeSchema();
  resetSchemaData();
}

/**
 * Closes the DB connection after all tests in a suite.
 * Call in afterAll.
 */
export function teardownDb(): void {
  closeDb();
}
