export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, options: { statusCode: number; code: string; details?: unknown }) {
    super(message);

    this.name = new.target.name;
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = options.details;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { statusCode: 400, code: "BAD_REQUEST", details });
  }
}

export class ValidationAppError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { statusCode: 400, code: "VALIDATION_ERROR", details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { statusCode: 401, code: "UNAUTHORIZED", details });
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { statusCode: 403, code: "FORBIDDEN", details });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { statusCode: 404, code: "NOT_FOUND", details });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { statusCode: 409, code: "CONFLICT", details });
  }
}

export class ConfigError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { statusCode: 500, code: "CONFIG_ERROR", details });
  }
}

export class InternalServerError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { statusCode: 500, code: "INTERNAL_SERVER_ERROR", details });
  }
}
