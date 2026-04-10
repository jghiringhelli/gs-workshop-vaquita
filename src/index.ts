import express from 'express';
import { config } from './config';
import { getDatabase } from './db';
import { UserRepository } from './repositories/user-repository';
import { TandaRepository } from './repositories/tanda-repository';
import { UserService } from './services/user.service';
import { TandaService } from './services/tanda.service';
import { createUserRoutes } from './routes/users';
import { createTandaRoutes } from './routes/tandas';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

/**
 * Initialize and start the Tanda API server
 */
async function main() {
  const app = express();

  // Middleware
  app.use(express.json());

  // Initialize database
  const db = getDatabase();

  // Initialize repositories
  const userRepository = new UserRepository(db);
  const tandaRepository = new TandaRepository(db);

  // Initialize services (dependency injection)
  const userService = new UserService(userRepository);
  const tandaService = new TandaService(tandaRepository, userRepository);

  // Routes
  app.use('/api/users', createUserRoutes(userService));
  app.use('/api/tandas', createTandaRoutes(tandaService));

  // Health check
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  // Start server
  const server = app.listen(config.port, () => {
    console.log(`🫰 Tanda API running on http://localhost:${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
