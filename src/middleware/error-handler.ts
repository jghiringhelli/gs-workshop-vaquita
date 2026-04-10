import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiErrorResponse } from '../types';

/**
 * Generic error handler middleware
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);

  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: Record<string, unknown> | undefined;

  // Handle Zod validation errors
  if (err instanceof z.ZodError) {
    statusCode = 422;
    errorCode = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = err.errors.reduce(
      (acc, error) => {
        const path = error.path.join('.');
        acc[path] = error.message;
        return acc;
      },
      {} as Record<string, string>
    );
  }
  // Handle User domain errors
  else if (err.name === 'UserEmailAlreadyExistsError') {
    statusCode = 409;
    errorCode = 'EMAIL_ALREADY_EXISTS';
    message = err.message;
  } else if (err.name === 'UserNotFoundError') {
    statusCode = 404;
    errorCode = 'USER_NOT_FOUND';
    message = err.message;
  }
  // Handle Tanda domain errors
  else if (err.name === 'TandaNotFoundError') {
    statusCode = 404;
    errorCode = 'TANDA_NOT_FOUND';
    message = err.message;
  } else if (err.name === 'InvalidTandaStatusError') {
    statusCode = 400;
    errorCode = 'INVALID_TANDA_STATUS';
    message = err.message;
  } else if (err.name === 'InsufficientParticipantsError') {
    statusCode = 400;
    errorCode = 'INSUFFICIENT_PARTICIPANTS';
    message = err.message;
  } else if (err.name === 'AlreadyParticipantError') {
    statusCode = 409;
    errorCode = 'ALREADY_PARTICIPANT';
    message = err.message;
  }

  const response: ApiErrorResponse = {
    error: {
      code: errorCode,
      message,
      details,
    },
  };

  res.status(statusCode).json(response);
}

/**
 * 404 handler middleware
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
}
