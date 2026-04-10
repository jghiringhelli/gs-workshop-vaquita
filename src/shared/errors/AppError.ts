export interface ErrorResponseBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}

/**
 * Base application error with an explicit HTTP mapping.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  public constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Error for invalid request payloads or business inputs.
 */
export class BadRequestError extends AppError {
  public constructor(message: string, details?: unknown) {
    super(400, "bad_request", message, details);
  }
}

/**
 * Error for forbidden actions.
 */
export class ForbiddenError extends AppError {
  public constructor(message: string, details?: unknown) {
    super(403, "forbidden", message, details);
  }
}

/**
 * Error for missing resources.
 */
export class NotFoundError extends AppError {
  public constructor(message: string, details?: unknown) {
    super(404, "not_found", message, details);
  }
}

/**
 * Error for conflicting state transitions or duplicate records.
 */
export class ConflictError extends AppError {
  public constructor(message: string, details?: unknown) {
    super(409, "conflict", message, details);
  }
}

/**
 * Error for semantically invalid requests that pass structural validation.
 */
export class UnprocessableEntityError extends AppError {
  public constructor(message: string, details?: unknown) {
    super(422, "unprocessable_entity", message, details);
  }
}

/**
 * Error for unexpected failures.
 */
export class InternalServerError extends AppError {
  public constructor(message = "An unexpected error occurred", details?: unknown) {
    super(500, "internal_server_error", message, details);
  }
}
