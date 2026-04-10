import express from 'express';
import { AppError } from './errors';
import tandasRouter from './routes/tandas';
import usersRouter from './routes/users';

const app = express();
app.use(express.json());

app.use('/api/users', usersRouter);
app.use('/api/tandas', tandasRouter);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
);

export default app;
