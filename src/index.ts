import { createApp } from './app';
import { createDatabase } from './db';
import { config } from './config';

const db = createDatabase();
const app = createApp(db);

app.listen(config.port, () => {
  console.log(`Tanda API running on port ${config.port}`);
});
