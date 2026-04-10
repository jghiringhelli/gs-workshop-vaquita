/**
 * Custom error hierarchy — spec requires no bare `throw new Error()`.
 */

export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    super(id ? `${resource} with id ${id} not found` : `${resource} not found`, 404);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  public readonly details: unknown;

  constructor(message: string, details?: unknown) {
    super(message, 422);
    this.details = details;
  }
}

