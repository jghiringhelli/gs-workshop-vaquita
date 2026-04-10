import { getDatabase } from "../db/database";
import { initializeSchema } from "../db/schema";

export function resetDatabaseForTests(): void {
  initializeSchema();

  const db = getDatabase();

  db.exec(`
    DELETE FROM contributions;
    DELETE FROM participants;
    DELETE FROM tandas;
    DELETE FROM users;
    DELETE FROM sqlite_sequence;
  `);
}
