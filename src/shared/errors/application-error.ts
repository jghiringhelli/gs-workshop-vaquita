/**
 * Structured application error that can be safely mapped to an HTTP response.
 */
export class ApplicationError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: Record<string, unknown>

  /**
   * Create an application error.
   *
   * @param options - Error metadata.
   */
  public constructor(options: {
    readonly code: string
    readonly message: string
    readonly statusCode: number
    readonly details?: Record<string, unknown>
  }) {
    super(options.message)
    this.name = "ApplicationError"
    this.code = options.code
    this.statusCode = options.statusCode
    this.details = options.details
  }
}

/**
 * HTTP 400 error for malformed business requests.
 */
export class BadRequestError extends ApplicationError {
  /**
   * Create a bad request error.
   *
   * @param message - Human-readable error message.
   * @param details - Optional structured details.
   */
  public constructor(message: string, details?: Record<string, unknown>) {
    super({ code: "BAD_REQUEST", message, statusCode: 400, details })
  }
}

/**
 * HTTP 401 error for authentication failures.
 */
export class UnauthorizedError extends ApplicationError {
  /**
   * Create an unauthorized error.
   *
   * @param message - Human-readable error message.
   */
  public constructor(message = "Authentication is required") {
    super({ code: "UNAUTHORIZED", message, statusCode: 401 })
  }
}

/**
 * HTTP 403 error for forbidden actions.
 */
export class ForbiddenError extends ApplicationError {
  /**
   * Create a forbidden error.
   *
   * @param message - Human-readable error message.
   */
  public constructor(message: string) {
    super({ code: "FORBIDDEN", message, statusCode: 403 })
  }
}

/**
 * HTTP 404 error for missing resources.
 */
export class NotFoundError extends ApplicationError {
  /**
   * Create a not found error.
   *
   * @param message - Human-readable error message.
   */
  public constructor(message: string) {
    super({ code: "NOT_FOUND", message, statusCode: 404 })
  }
}

/**
 * HTTP 409 error for conflicting resource state.
 */
export class ConflictError extends ApplicationError {
  /**
   * Create a conflict error.
   *
   * @param message - Human-readable error message.
   * @param details - Optional structured details.
   */
  public constructor(message: string, details?: Record<string, unknown>) {
    super({ code: "CONFLICT", message, statusCode: 409, details })
  }
}

/**
 * HTTP 422 error for semantic validation failures.
 */
export class ValidationError extends ApplicationError {
  /**
   * Create a validation error.
   *
   * @param message - Human-readable error message.
   * @param details - Optional structured validation details.
   */
  public constructor(message: string, details?: Record<string, unknown>) {
    super({ code: "VALIDATION_ERROR", message, statusCode: 422, details })
  }
}
