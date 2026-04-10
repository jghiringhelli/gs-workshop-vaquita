export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  /**
   * Creates an application error with an HTTP status and stable code.
   * @param message Human readable error message.
   * @param statusCode HTTP status code to return.
   * @param code Stable application error code.
   */
  public constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  /**
   * Creates a validation error for invalid client input.
   * @param message Validation message.
   */
  public constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class UnauthorizedError extends AppError {
  /**
   * Creates an unauthorized error.
   * @param message Authentication failure message.
   */
  public constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  /**
   * Creates a forbidden error.
   * @param message Authorization failure message.
   */
  public constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  /**
   * Creates a not found error.
   * @param message Not found message.
   */
  public constructor(message: string) {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  /**
   * Creates a conflict error.
   * @param message Conflict message.
   */
  public constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}
