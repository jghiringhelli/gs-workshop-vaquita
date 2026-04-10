/**
 * Custom error hierarchy for the Tanda API.
 * All thrown errors must be instances of AppError (or a subclass).
 */

/**
 * Base application error with an HTTP status code.
 * @param message - Human-readable error description
 * @param statusCode - HTTP status code to return
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 404 — resource not found */
export class NotFoundError extends AppError {
  /** @param message - Description of what was not found */
  constructor(message: string) {
    super(message, 404);
  }
}

/** 400 — invalid input or business rule violation */
export class ValidationError extends AppError {
  /** @param message - Description of the validation failure */
  constructor(message: string) {
    super(message, 400);
  }
}

/** 403 — caller lacks permission */
export class ForbiddenError extends AppError {
  /** @param message - Description of the permission denial */
  constructor(message: string) {
    super(message, 403);
  }
}

/** 409 — conflict with current resource state */
export class ConflictError extends AppError {
  /** @param message - Description of the conflict */
  constructor(message: string) {
    super(message, 409);
  }
}

/** 422 — request well-formed but entity is in wrong state */
export class UnprocessableError extends AppError {
  /** @param message - Description of the unprocessable condition */
  constructor(message: string) {
    super(message, 422);
  }
}

