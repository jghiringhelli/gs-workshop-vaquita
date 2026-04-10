/**
 * Custom Error Classes
 * Structured error hierarchy for the application
 */

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Validation errors (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, 'VALIDATION_ERROR', details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Resource not found errors (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(404, message, 'NOT_FOUND');
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Conflict errors (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(409, message, 'CONFLICT', details);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Forbidden/Authorization errors (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, message, 'FORBIDDEN');
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Business logic rule violations (422)
 */
export class BusinessRuleError extends AppError {
  constructor(message: string, details?: unknown) {
    super(422, message, 'BUSINESS_RULE_VIOLATION', details);
    Object.setPrototypeOf(this, BusinessRuleError.prototype);
  }
}

/**
 * Unprocessable Entity errors (422)
 */
export class UnprocessableEntityError extends AppError {
  constructor(message: string, details?: unknown) {
    super(422, message, 'UNPROCESSABLE_ENTITY', details);
    Object.setPrototypeOf(this, UnprocessableEntityError.prototype);
  }
}

/**
 * Internal server errors (500)
 */
export class InternalError extends AppError {
  constructor(message: string, details?: unknown) {
    super(500, message, 'INTERNAL_ERROR', details);
    Object.setPrototypeOf(this, InternalError.prototype);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
