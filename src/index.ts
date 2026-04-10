// Tanda API — Entry point
import express from 'express';
import { config } from './config';
import userRoutes from './routes/users';
import tandaRoutes from './routes/tandas';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/tandas', tandaRoutes);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`Tanda API running on http://localhost:${config.port}`);
  });
}

export default app;
