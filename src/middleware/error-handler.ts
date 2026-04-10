import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/errors';
import { ZodError } from 'zod';
import { logger } from '../logger';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.issues });
    return;
  }

  logger.error('Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
