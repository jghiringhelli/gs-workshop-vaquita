import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../errors/app-error";

/**
 * Catch-all error handler — maps AppError subclasses to HTTP responses.
 * Unknown errors become 500.
 */
export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: "Internal server error" });
};

/**
 * 404 handler for unmatched routes.
 */
export const notFoundMiddleware: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Not found" });
};
