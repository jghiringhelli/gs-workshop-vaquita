import { ZodSchema } from 'zod';
import { ValidationError } from '../errors/AppError';

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error.errors.map(e => e.message).join(', '));
  }
  return result.data;
}
