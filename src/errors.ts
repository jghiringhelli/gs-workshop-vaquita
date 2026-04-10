export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message, 400, code);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, code: string = 'BUSINESS_RULE_ERROR') {
    super(message, 409, code);
    Object.setPrototypeOf(this, BusinessRuleError.prototype);
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Unauthorized', code: string = 'AUTH_ERROR') {
    super(message, 401, code);
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', code: string = 'FORBIDDEN') {
    super(message, 403, code);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}
