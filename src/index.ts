import express from 'express';
import { config } from './config.js';
import { runMigrations } from './db/schema.js';
import { userRouter } from './routes/users.js';
import { tandaRouter } from './routes/tandas.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/users', userRouter);
app.use('/api/tandas', tandaRouter);

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  runMigrations();
  app.listen(config.port, () => {
    console.log(`Tanda API listening on http://localhost:${config.port}`);
  });
}
