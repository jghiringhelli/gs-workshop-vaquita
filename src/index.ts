import { createApp } from './app';
import { CONFIG } from './config';
import { getDatabase } from './db/database';

const app = createApp();

getDatabase();

app.listen(CONFIG.PORT, () => {
  console.log(`🚀 Tanda API running on http://localhost:${CONFIG.PORT}`);
  console.log(`📊 Database: ${CONFIG.DATABASE_PATH}`);
  console.log(`✅ Health check: http://localhost:${CONFIG.PORT}/health`);
});
