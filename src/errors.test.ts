import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  NotFoundError,
  BusinessRuleError,
  AuthError,
  ForbiddenError,
} from '../src/errors';

describe('Error Classes', () => {
  it('should create AppError with correct properties', () => {
    const error = new AppError('Test error', 500, 'TEST_ERROR');
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.name).toBe('AppError');
  });

  it('should create ValidationError with 400 status', () => {
    const error = new ValidationError('Invalid input', 'INVALID_EMAIL');
    expect(error.message).toBe('Invalid input');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('INVALID_EMAIL');
    expect(error.name).toBe('ValidationError');
  });

  it('should create NotFoundError with 404 status and formatted message', () => {
    const error = new NotFoundError('User', '123');
    expect(error.message).toBe("User with id '123' not found");
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.name).toBe('NotFoundError');
  });

  it('should create NotFoundError without id', () => {
    const error = new NotFoundError('Tanda');
    expect(error.message).toBe('Tanda not found');
    expect(error.statusCode).toBe(404);
  });

  it('should create BusinessRuleError with 409 status', () => {
    const error = new BusinessRuleError(
      'Tanda needs at least 3 participants',
      'MIN_PARTICIPANTS_NOT_MET'
    );
    expect(error.message).toBe('Tanda needs at least 3 participants');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('MIN_PARTICIPANTS_NOT_MET');
    expect(error.name).toBe('BusinessRuleError');
  });

  it('should create AuthError with 401 status', () => {
    const error = new AuthError('Invalid token', 'INVALID_TOKEN');
    expect(error.message).toBe('Invalid token');
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('INVALID_TOKEN');
    expect(error.name).toBe('AuthError');
  });

  it('should create AuthError with default message', () => {
    const error = new AuthError();
    expect(error.message).toBe('Unauthorized');
    expect(error.statusCode).toBe(401);
  });

  it('should create ForbiddenError with 403 status', () => {
    const error = new ForbiddenError('Only organizer can do this', 'NOT_ORGANIZER');
    expect(error.message).toBe('Only organizer can do this');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('NOT_ORGANIZER');
    expect(error.name).toBe('ForbiddenError');
  });

  it('should create ForbiddenError with default message', () => {
    const error = new ForbiddenError();
    expect(error.message).toBe('Forbidden');
    expect(error.statusCode).toBe(403);
  });

  it('should be instanceof Error', () => {
    const error = new ValidationError('Test');
    expect(error instanceof Error).toBe(true);
  });
});
