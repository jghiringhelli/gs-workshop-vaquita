// Tanda API — Entry point
import { createApp } from './app.js';
import { getConfig } from './shared/config/index.js';

const app = createApp();
const { port } = getConfig();

app.listen(port, () => {
  console.log(`Tanda API running on http://localhost:${port}`);
});
