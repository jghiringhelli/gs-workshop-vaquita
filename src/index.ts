import app from './app';
import { config } from './config';
import { logger } from './logger';

app.listen(config.PORT, () => {
  logger.info(`Tanda API running on http://localhost:${config.PORT}`);
});
