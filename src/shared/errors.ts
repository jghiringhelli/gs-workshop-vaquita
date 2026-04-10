/**
 * Base application error with HTTP metadata.
 */
export class AppError extends Error {
  /**
   * Create an application error.
   *
   * @param statusCode HTTP status code for the error.
   * @param code Stable machine-readable error code.
   * @param message Human-readable error message.
   */
  public constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * Error raised when a requested resource is missing.
 */
export class NotFoundError extends AppError {
  /**
   * Create a not found error.
   *
   * @param message Human-readable error message.
   */
  public constructor(message: string) {
    super(404, "not_found", message);
  }
}

/**
 * Error raised when a resource conflicts with current state.
 */
export class ConflictError extends AppError {
  /**
   * Create a conflict error.
   *
   * @param message Human-readable error message.
   */
  public constructor(message: string) {
    super(409, "conflict", message);
  }
}

/**
 * Error raised when a request is forbidden.
 */
export class ForbiddenError extends AppError {
  /**
   * Create a forbidden error.
   *
   * @param message Human-readable error message.
   */
  public constructor(message: string) {
    super(403, "forbidden", message);
  }
}

/**
 * Error raised when a request is semantically invalid.
 */
export class UnprocessableEntityError extends AppError {
  /**
   * Create an unprocessable entity error.
   *
   * @param message Human-readable error message.
   */
  public constructor(message: string) {
    super(422, "unprocessable_entity", message);
  }
}

/**
 * Error raised when request data violates a business rule.
 */
export class ValidationError extends AppError {
  /**
   * Create a validation error.
   *
   * @param message Human-readable error message.
   */
  public constructor(message: string) {
    super(400, "validation_error", message);
  }
}
