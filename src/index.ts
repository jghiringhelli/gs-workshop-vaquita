import express, { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import './db';
import { AppError } from './errors';
import userRoutes from './routes/users';
import tandaRoutes from './routes/tandas';
import { config } from './config';

const app = express();

app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/tandas', tandaRoutes);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.errors });
  }
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`Tanda API running on http://localhost:${config.port}`);
  });
}

export default app;
