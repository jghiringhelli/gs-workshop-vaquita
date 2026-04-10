import { createDatabase } from './db/database';
import { createApp } from './app';
import { config } from './config';

const db = createDatabase();
const app = createApp(db);

app.listen(config.PORT, () => {
  console.log(`Tanda API running on http://localhost:${config.PORT}`);
});
