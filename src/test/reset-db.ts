import { initializeSchema, resetSchemaData } from "../db/schema";

export function resetDatabaseForTests(): void {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "test-secret";
  }

  initializeSchema();
  resetSchemaData();
}
