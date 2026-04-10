import 'dotenv/config';
import express from 'express';
import { config } from './config';
import { AppError } from './errors/AppError';
import { userRouter } from './routes/userRouter';
import { poolRouter } from './routes/poolRouter';
import { withdrawalRouter } from './routes/withdrawalRouter';

export const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/users', userRouter);
app.use('/api/pools', poolRouter);
app.use('/api/withdrawals', withdrawalRouter);

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

