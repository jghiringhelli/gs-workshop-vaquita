import express from "express";

import { initializeSchema } from "./db/schema";
import { apiRoutes } from "./routes/api-routes";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./middleware/error-middleware";

export function createApp(): express.Express {
  initializeSchema();

  const app = express();

  app.use(express.json());
  app.use("/api", apiRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
