/** Base class for all application errors. Carries an HTTP status code. */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** 404 — resource does not exist */
export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`, 404, "NOT_FOUND");
  }
}

/** 403 — caller lacks permission for this action */
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403, "FORBIDDEN");
  }
}

/** 409 — request conflicts with current resource state */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

/** 422 — request is syntactically valid but semantically wrong */
export class UnprocessableError extends AppError {
  constructor(message: string) {
    super(message, 422, "UNPROCESSABLE");
  }
}

/** 400 — request payload failed validation */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
  }
}
