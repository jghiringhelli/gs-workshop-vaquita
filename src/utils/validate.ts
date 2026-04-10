import { ZodSchema } from 'zod';
import { ValidationError } from '../errors';

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(
      'Validation failed',
      result.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    );
  }
  return result.data;
}
