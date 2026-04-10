import express from 'express';
import usersRoutes from './routes/users.routes';
import tandasRoutes from './routes/tandas.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(express.json());

app.use('/api/users', usersRoutes);
app.use('/api/tandas', tandasRoutes);

app.use(errorHandler);

export default app;
