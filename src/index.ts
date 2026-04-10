import { createApp } from "./app";
import { loadConfig } from "./config/env";
import { connectDatabase } from "./db/database";
import { initializeSchema } from "./db/schema";

const config = loadConfig();
const db = connectDatabase(config.databaseUrl);

initializeSchema(db);

const app = createApp({ db, config });

app.listen(config.port, () => {
  process.stdout.write(`Tanda API listening on http://localhost:${config.port}\n`);
});
