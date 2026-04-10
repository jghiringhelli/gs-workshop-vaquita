import 'dotenv/config';
import express from 'express';
import { config } from './config';
import { AppError } from './errors/AppError';

export const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Route mounts will be added here as endpoints are implemented

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  },
);

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`Tanda API listening on port ${config.port}`);
  });
}

