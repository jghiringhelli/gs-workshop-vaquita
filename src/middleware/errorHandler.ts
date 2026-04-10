import { Request, Response, NextFunction } from 'express';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BusinessRuleError,
  ConflictError,
} from '../errors/customErrors';

interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(`[Error] ${err.name}: ${err.message}`);
  console.error(err.stack);

  const response: ErrorResponse = {
    error: err.name,
    message: err.message,
  };

  if (err instanceof ValidationError) {
    res.status(err.statusCode).json(response);
  } else if (err instanceof NotFoundError) {
    res.status(err.statusCode).json(response);
  } else if (err instanceof UnauthorizedError) {
    res.status(err.statusCode).json(response);
  } else if (err instanceof ForbiddenError) {
    res.status(err.statusCode).json(response);
  } else if (err instanceof BusinessRuleError) {
    res.status(err.statusCode).json(response);
  } else if (err instanceof ConflictError) {
    res.status(err.statusCode).json(response);
  } else {
    res.status(500).json({
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
    });
  }
}
