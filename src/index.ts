// Tanda API — Entry point
import express from 'express';
import { getDatabase } from './db';
import { ServiceFactory } from './services';
import { config, validateConfig } from './config';
import { createUserRoutes } from './routes/users';
import { createTandaRoutes } from './routes/tandas';
import { errorHandler } from './routes/middleware';

// Validate config
validateConfig();

// Initialize database
const db = getDatabase();
const services = new ServiceFactory(db);

// Create Express app
const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/users', createUserRoutes(services));
app.use('/api/tandas', createTandaRoutes(services));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling
app.use(errorHandler);

// Start server
const port = config.PORT;
const server = app.listen(port, () => {
  console.log(`🫰 Tanda API listening on port ${port}`);
});

export default app;

