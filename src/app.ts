import express from "express";
import { initializeDatabase } from "./db";
import routes from "./routes";
import { errorHandler, requestLogger } from "./middleware";

/**
 * Express application setup
 */

export function createApp() {
  const app = express();

  // Initialize database
  initializeDatabase();

  // Middleware
  app.use(express.json());
  app.use(requestLogger);

  // Routes
  app.use("/", routes);

  // Health check
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: "Not Found",
      code: "NOT_FOUND",
    });
  });

  // Error handling (must be last)
  app.use(errorHandler);

  return app;
}

export default createApp;
