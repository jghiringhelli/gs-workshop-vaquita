/** Base application error — always carries an HTTP status code. */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** 404 — resource not found. */
export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404);
  }
}

/** 400 — invalid input that passed schema validation but failed a business rule. */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

/** 403 — caller lacks permission. */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

/** 409 — state conflict (e.g. duplicate contribution, wrong tanda status). */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

/** 422 — resource exists but is in the wrong state for this operation. */
export class UnprocessableError extends AppError {
  constructor(message: string) {
    super(message, 422);
  }
}
