import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors';

/**
 * Global Express error handler.
 *
 * Must be registered as the last middleware in `app.ts`.
 * Maps AppError subclasses and ZodError to a consistent JSON response shape:
 *   `{ error: { code, message, details? } }`
 *
 * Unhandled errors fall back to 500 Internal Server Error.
 *
 * @param err - The thrown error value.
 * @param _req - Express request object (unused).
 * @param res - Express response object.
 * @param _next - Express next function (unused but required by Express signature).
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.flatten(),
      },
    });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
