// Tanda API — Entry point
import { config } from './config';
import { createDb } from './db/db';
import { createApp } from './app';

// Validate required env vars eagerly so the process fails clearly on startup.
try {
  void config.jwtSecret;
} catch (err) {
  console.error('[startup]', (err as Error).message);
  process.exit(1);
}

const db = createDb(config.dbPath);
const app = createApp(db);

app.listen(config.port, () => {
  console.log(`Tanda API listening on http://localhost:${config.port}`);
});

