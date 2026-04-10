/**
 * Base class for all application errors.
 * Carries an HTTP status code and a machine-readable code alongside the message.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  /**
   * @param statusCode - HTTP status code to return to the client
   * @param message - Human-readable description of the error
   * @param code - Machine-readable error identifier
   */
  constructor(statusCode: number, message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 404 — requested resource does not exist. */
export class NotFoundError extends AppError {
  /**
   * @param resource - Human-readable resource type, e.g. "Tanda"
   * @param id - The identifier that was looked up
   */
  constructor(resource: string, id: string | number) {
    super(404, `${resource} '${id}' not found`, 'NOT_FOUND');
  }
}

/** 409 — request conflicts with current resource state. */
export class ConflictError extends AppError {
  /** @param message - Description of the conflict */
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

/** 403 — caller is authenticated but lacks permission for this action. */
export class ForbiddenError extends AppError {
  /** @param message - Description of the access violation */
  constructor(message: string) {
    super(403, message, 'FORBIDDEN');
  }
}

/** 422 — request body is syntactically valid but fails business/schema validation. */
export class UnprocessableEntityError extends AppError {
  /** @param message - Description of the validation failure */
  constructor(message: string) {
    super(422, message, 'VALIDATION_ERROR');
  }
}

/** 400 — request is malformed or missing required data. */
export class BadRequestError extends AppError {
  /** @param message - Description of the problem */
  constructor(message: string) {
    super(400, message, 'BAD_REQUEST');
  }
}
