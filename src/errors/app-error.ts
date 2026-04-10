/**
 * Application error hierarchy.
 * All thrown errors must extend AppError — no bare `throw new Error()` in domain code.
 */

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** 400 — Request body / params failed validation. */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

/** 404 — Requested resource does not exist. */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}

/** 401 — Missing or invalid authentication token. */
export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(401, message);
  }
}

/** 403 — Authenticated but not allowed to perform this action. */
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, message);
  }
}

/** 409 — Action conflicts with current resource state. */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

/** 500 — Missing required configuration. */
export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(500, message);
  }
}
