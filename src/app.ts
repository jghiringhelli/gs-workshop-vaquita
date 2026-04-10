import express, { Router } from 'express';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

export type RouteMount = { path: string; router: Router };

/**
 * Creates and configures the Express application.
 * Mounts the /health endpoint, any provided feature routers, and the error handler.
 *
 * @param routes - Feature routers to mount (path + Router pairs). Empty by default.
 * @returns Configured Express application (not yet listening)
 */
export function createApp(routes: RouteMount[] = []): express.Application {
  const app = express();

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({
      data: {
        status: 'ok',
        version: process.env['npm_package_version'] ?? '0.0.0',
        uptime: process.uptime(),
        environment: config.nodeEnv,
      },
    });
  });

  for (const { path, router } of routes) {
    app.use(path, router);
  }

  app.use(errorHandler);

  return app;
}
