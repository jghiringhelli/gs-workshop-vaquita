import { getConfig } from "../src/config";
import { createDatabase } from "../src/lib/database";

const config = getConfig();
const db = createDatabase(config.databasePath);

function main(): void {
  try {
    db.exec(`
      DELETE FROM contributions;
      DELETE FROM participants;
      DELETE FROM tandas;
      DELETE FROM users;
      DELETE FROM sqlite_sequence WHERE name IN ('contributions', 'participants', 'tandas', 'users');
    `);

    console.log(`Database reset complete for ${config.databasePath}`);
  } finally {
    db.close();
  }
}

main();
