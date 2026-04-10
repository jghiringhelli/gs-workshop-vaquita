import app from './app';
import { PORT } from './config';
import { getDb } from './db';

// Initialise database on startup
getDb();

app.listen(PORT, () => {
  console.log(`Tanda API running on http://localhost:${PORT}`);
});
