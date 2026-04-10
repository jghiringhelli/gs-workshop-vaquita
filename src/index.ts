import app from './app';
import { config } from './config';

const server = app.listen(config.PORT, () => {
  console.log(`Tanda API running on http://localhost:${config.PORT}`);
});

export default server;
