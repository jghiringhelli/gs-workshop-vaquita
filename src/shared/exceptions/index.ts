/**
 * Base application error carrying an HTTP status code and a machine-readable code.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a requested resource does not exist.
 * @param message - Human-readable description.
 */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super('NOT_FOUND', message, 404);
  }
}

/**
 * Thrown when the caller lacks permission to perform an action.
 * @param message - Human-readable description.
 */
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super('FORBIDDEN', message, 403);
  }
}

/**
 * Thrown when an operation would violate a uniqueness or state constraint.
 * @param message - Human-readable description.
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

/**
 * Thrown when input data fails domain-level validation.
 * @param message - Human-readable description.
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
  }
}
