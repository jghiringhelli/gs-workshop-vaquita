import express from 'express';
import { config } from './config';
import { usersRouter } from './routes/users';
import { tandasRouter } from './routes/tandas';
import { errorHandler } from './middleware/errorHandler';

export const app = express();
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ name: 'Tanda API', status: 'ok', version: '1.0.0' });
});

app.use('/api/users', usersRouter);
app.use('/api/tandas', tandasRouter);
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Tanda API running on port ${config.port}`);
  });
}
