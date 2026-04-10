import { app } from './app';
import { config } from './config';

if (config.nodeEnv !== 'test') {
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

export { app };
