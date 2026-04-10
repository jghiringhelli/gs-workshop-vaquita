export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  public constructor(
    message: string,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationAppError extends AppError {
  public constructor(message: string, details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class NotFoundError extends AppError {
  public constructor(message: string) {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  public constructor(message: string, details?: unknown) {
    super(message, 409, "CONFLICT", details);
  }
}

export class ForbiddenError extends AppError {
  public constructor(message: string) {
    super(message, 403, "FORBIDDEN");
  }
}

export class UnauthorizedError extends AppError {
  public constructor(message: string) {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class InternalInvariantError extends AppError {
  public constructor(message: string, details?: unknown) {
    super(message, 500, "INTERNAL_INVARIANT", details);
  }
}

export class ConfigurationError extends AppError {
  public constructor(message: string, details?: unknown) {
    super(message, 500, "CONFIGURATION_ERROR", details);
  }
}