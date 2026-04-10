import app from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`🫰 Tanda API listening on port ${env.PORT} (${env.NODE_ENV})`);
});

export default server;
