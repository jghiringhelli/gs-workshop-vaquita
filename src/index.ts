import './loadEnv'; // must be first — loads .env before any other module reads process.env
import { createApp } from './app';
import { createDatabase } from './db/database';
import { config } from './config/env';

const db = createDatabase();
const app = createApp(db);

app.listen(config.port, () => {
  console.log(`Tanda API running on port ${config.port}`);
});
