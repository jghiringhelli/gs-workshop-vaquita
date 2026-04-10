import express, { Request, Response } from 'express';
import { usersRouter } from './modules/users/users.router';
import { tandasRouter } from './modules/tandas/tandas.router';
import { errorHandler } from './shared/middleware/errorHandler';

export const app = express();

app.use(express.json());

app.use('/api/users', usersRouter);
app.use('/api/tandas', tandasRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

app.use(errorHandler);

if (require.main === module) {
  const PORT = process.env['PORT'] ?? '3000';
  app.listen(Number(PORT), () =>
    console.log(`Tanda API running on port ${PORT}`),
  );
}
