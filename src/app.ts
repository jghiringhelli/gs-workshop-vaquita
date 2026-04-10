import express, { NextFunction, Request, Response } from 'express';
import { AppError } from './errors';
import tandasRouter from './routes/tandas';
import usersRouter from './routes/users';

export const app = express();

app.use(express.json());

// Routes
app.use('/api/users', usersRouter);
app.use('/api/tandas', tandasRouter);

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
