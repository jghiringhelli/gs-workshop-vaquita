import { createApp } from './app';
import { createDatabase } from './shared/db/database';
import { getConfig } from './shared/config/config';

const config = getConfig();
const db = createDatabase(config.dbPath);
const app = createApp(db);

app.listen(config.port, () => {
  console.log(`Tanda API running on http://localhost:${config.port}`);
});
