import express from 'express';
import usersRouter from './routes/users.routes';
import tandasRouter from './routes/tandas.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/users', usersRouter);
app.use('/api/tandas', tandasRouter);

app.use(errorHandler);

export default app;
