/**
 * Application error hierarchy.
 *
 * All thrown errors must extend AppError.
 * Never throw bare Error objects in service or repository layers.
 */

/** Base class for all application errors. Carries HTTP status and error code. */
export class AppError extends Error {
  constructor(
    /** Machine-readable error code returned in the response body. */
    public readonly code: string,
    message: string,
    /** HTTP status code to use when sending the response. */
    public readonly statusCode: number,
    /** Optional structured details (e.g., Zod validation issues). */
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 422 Unprocessable Entity — request schema/format is invalid. */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 422, details);
  }
}

/** 404 Not Found — requested resource does not exist. */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super('NOT_FOUND', message, 404);
  }
}

/** 403 Forbidden — authenticated user lacks permission for the operation. */
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super('FORBIDDEN', message, 403);
  }
}

/** 409 Conflict — state conflict (e.g., duplicate resource). */
export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

/** 422 Business Rule Violation — valid input but domain rule prevents the operation. */
export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super('BUSINESS_RULE_VIOLATION', message, 422);
  }
}

/** 401 Unauthorized — no valid authentication credentials provided. */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, 401);
  }
}
