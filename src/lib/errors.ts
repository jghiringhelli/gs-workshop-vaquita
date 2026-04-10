export interface ErrorContext {
  readonly details?: unknown;
}

export class AppError extends Error {
  public readonly statusCode: number;

  public readonly code: string;

  public readonly details?: unknown;

  public constructor(message: string, statusCode: number, code: string, context: ErrorContext = {}) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = context.details;
  }
}

export class NotFoundError extends AppError {
  public constructor(message: string, context: ErrorContext = {}) {
    super(message, 404, "NOT_FOUND", context);
  }
}

export class BadRequestError extends AppError {
  public constructor(message: string, context: ErrorContext = {}) {
    super(message, 400, "BAD_REQUEST", context);
  }
}

export class ForbiddenError extends AppError {
  public constructor(message: string, context: ErrorContext = {}) {
    super(message, 403, "FORBIDDEN", context);
  }
}

export class ValidationAppError extends AppError {
  public constructor(message: string, context: ErrorContext = {}) {
    super(message, 422, "VALIDATION_ERROR", context);
  }
}

export class ConflictError extends AppError {
  public constructor(message: string, context: ErrorContext = {}) {
    super(message, 409, "CONFLICT", context);
  }
}

export class NotImplementedAppError extends AppError {
  public constructor(message: string, context: ErrorContext = {}) {
    super(message, 501, "NOT_IMPLEMENTED", context);
  }
}