import express from 'express';
import { initializeDatabase } from './db/database';
import userRoutes from './routes/user.routes';
import tandaRoutes from './routes/tanda.routes';
import { errorHandler } from './middleware/error-handler';

initializeDatabase();

const app = express();

app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/tandas', tandaRoutes);

app.use(errorHandler);

export default app;
