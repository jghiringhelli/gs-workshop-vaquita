import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../exceptions';

/**
 * Global error-handling middleware.
 * Maps known error types to structured JSON responses.
 */
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.code, message: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: err.errors,
    });
    return;
  }

  if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'SQLITE_CONSTRAINT_UNIQUE') {
    res.status(409).json({ error: 'CONFLICT', message: 'Resource already exists' });
    return;
  }

  console.error('[UnhandledError]', err);
  res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
};
