import express from "express";
import { getConfig } from "./config/env";
import { initializeSchema } from "./db/schema";
import { createApiRoutes } from "./routes/api-routes";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error-middleware";

/**
 * Creates and configures the Express application.
 * Call this once at startup — schema is initialised here.
 * @returns configured Express app
 */
export function createApp(): express.Express {
  initializeSchema();
  const config = getConfig();

  const app = express();
  app.use(express.json());
  app.use("/api", createApiRoutes(config));
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
