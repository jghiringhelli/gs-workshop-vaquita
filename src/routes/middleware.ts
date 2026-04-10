import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';
import { ZodError } from 'zod';

export interface AuthRequest extends Request {
  userId?: string;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): Response {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.errors,
    });
  }

  // Custom app errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  // Unexpected errors
  console.error('Unexpected error:', err);
  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}

export function validateRequest<T extends Record<string, unknown>>(schema: { parse: (data: unknown) => T }): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.body);
      (req as unknown as Record<string, unknown>).validatedBody = validated;
      next();
    } catch (error) {
      next(error);
    }
  };
}
