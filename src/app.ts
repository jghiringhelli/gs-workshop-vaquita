import express, { Request, Response, NextFunction } from 'express';
import { userRouter } from './routes/users';
import { tandaRouter } from './routes/tandas';
import { AppError } from './errors';

const app = express();
app.use(express.json());
app.use('/api/users', userRouter);
app.use('/api/tandas', tandaRouter);

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
});

export { app };
