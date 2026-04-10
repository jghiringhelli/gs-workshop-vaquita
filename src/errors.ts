export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 404, "not_found", details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "validation_error", details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, "conflict", details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 403, "forbidden", details);
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;
