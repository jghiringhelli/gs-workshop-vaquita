import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp(): express.Express {
  const app = express();

  app.use(express.json());

  // Routes will be mounted here in Phase 4

  app.use(errorHandler);

  return app;
}
