import { Request, Response, NextFunction } from 'express';
import { AppError } from '../exceptions/AppError';

/** Centralised error handler — maps AppError subclasses to HTTP responses. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
}
