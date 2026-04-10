/**
 * Tanda API — Entry Point
 *
 * Layer Architecture:
 * Route Handlers → Services → Repositories → Database
 *
 * - Routes: Handle HTTP requests/responses, delegate to services
 * - Services: Implement business logic, enforce rules, call repositories
 * - Repositories: Handle all database operations, map to domain entities
 * - Database: SQLite via better-sqlite3
 *
 * Error Handling:
 * - Custom error hierarchy (AppError, ValidationError, NotFoundError, etc.)
 * - Async handler wrapper catches errors and passes to middleware
 * - Centralized error middleware formats responses
 *
 * Validation:
 * - Zod schemas define input contracts
 * - Validated at route handler entry points
 * - Type-safe errors with explicit error codes and HTTP status codes
 */

import express, { Express } from 'express';
import { initializeDatabase, getDatabase } from './database/index.js';
import { createRepositories } from './repositories/index.js';
import { createServices } from './services/index.js';
import { config, validateConfig } from './config/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { createUserRoutes } from './routes/userRoutes.js';
import { createTandaRoutes } from './routes/tandaRoutes.js';
import { createContributionRoutes } from './routes/contributionRoutes.js';

/**
 * Initialize and start the API server
 */
export function createApp(): Express {
  // Validate configuration first
  validateConfig();

  // Initialize database
  initializeDatabase();
  const db = getDatabase();

  // Create repositories
  const repositories = createRepositories(db);

  // Create services
  const services = createServices(repositories);

  // Create Express app
  const app = express();

  // Middleware
  app.use(express.json());

  // Add a simple health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/users', createUserRoutes(services));
  app.use('/api/tandas', createTandaRoutes(services));
  app.use('/api/tandas', createContributionRoutes(services));

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
      },
    });
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
function startServer(): void {
  const app = createApp();
  const port = config.server.port;

  app.listen(port, () => {
    console.log(`🫰 Tanda API server running on http://localhost:${port}`);
    console.log(`📚 API Documentation: See docs/spec.md`);
    console.log(`🏥 Health Check: GET http://localhost:${port}/health`);
  });
}

// Start server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default createApp;
