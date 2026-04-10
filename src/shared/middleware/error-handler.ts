import { Request, Response, NextFunction } from 'express';
import { AppError } from '../exceptions/index.js';

/**
 * Global Express error handler.
 * Converts AppError subclasses to JSON responses; unknown errors become 500.
 *
 * @param err  - The thrown error
 * @param _req - Express request (unused)
 * @param res  - Express response
 * @param _next - Express next (required by signature)
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}

