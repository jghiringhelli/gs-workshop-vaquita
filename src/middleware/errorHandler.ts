import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../logger';

/**
 * Global Express error handler. Must be registered last (after all routes).
 * - AppError subclasses: returned with their statusCode and code.
 * - Unexpected errors: logged and returned as 500 INTERNAL_ERROR.
 *
 * Always responds with the envelope shape: { errors: [{ code, message }] }
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      errors: [{ code: err.code, message: err.message }],
    });
    return;
  }

  logger.error({ err, method: req.method, path: req.path }, 'Unhandled error');
  res.status(500).json({
    errors: [{ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }],
  });
}
