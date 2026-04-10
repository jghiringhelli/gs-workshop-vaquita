import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import { config } from './config';
import { getDb } from './db';
import { AppError } from './errors';

export const app = express();

app.use(express.json());

// Initialise database on startup
getDb();

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Tanda API listening on port ${config.port}`);
  });
}
