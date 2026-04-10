import { createApp } from './app';
import { config } from './config/env';

const app = createApp();

app.listen(config.PORT, () => {
  console.log(`🫰 Tanda API running on http://localhost:${config.PORT}`);
});
