import { NextFunction } from 'express';
import { ZodError } from 'zod';
import { ValidationError } from '../exceptions/AppError';

/**
 * Converts a ZodError to a ValidationError and passes it to the next handler.
 * Use this inside route try/catch blocks.
 * @param err - The caught error.
 * @param next - Express next function.
 */
export function handleZodError(err: unknown, next: NextFunction): void {
  if (err instanceof ZodError) {
    next(new ValidationError(err.errors[0]?.message ?? 'Invalid input'));
  } else {
    next(err);
  }
}
