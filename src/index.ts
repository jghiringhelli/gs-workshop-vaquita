// Tanda API — Entry point
// Build your API here. Good luck! 🫰
import 'dotenv/config';
import { createApp } from './app';
import { config } from './shared/config';

const app = createApp();

app.listen(config.port, () => {
  console.log(`Tanda API listening on port ${config.port}`);
});

