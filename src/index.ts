import 'dotenv/config';
import { app } from './app';
import { config } from './config';
import { getDb } from './db';

// Initialise database on startup
getDb();

app.listen(config.port, () => {
  console.log(`Tanda API listening on port ${config.port}`);
});
