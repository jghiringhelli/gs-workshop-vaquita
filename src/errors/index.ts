export type ErrorCode =
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'BUSINESS_RULE';

/** Base application error. All custom errors extend this. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;

  constructor(message: string, code: ErrorCode, httpStatus: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/** 404 — requested resource does not exist. */
export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`, 'NOT_FOUND', 404);
  }
}

/** 409 — resource already exists or state conflict. */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

/** 403 — caller lacks permission to perform the action. */
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 'FORBIDDEN', 403);
  }
}

/** 422 — input data failed schema validation. */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION', 422);
  }
}

/** 422 — input is valid but violates a domain business rule. */
export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(message, 'BUSINESS_RULE', 422);
  }
}
