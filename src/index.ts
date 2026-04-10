import { createApp } from './app';
import { createDatabase } from './db/database';
import { config } from './config';

const db = createDatabase(config.dbPath);
const app = createApp(db);

if (process.env['NODE_ENV'] !== 'test') {
  app.listen(config.port, () => {
    console.log(`Tanda API running on http://localhost:${config.port}`);
  });
}

export { app };
