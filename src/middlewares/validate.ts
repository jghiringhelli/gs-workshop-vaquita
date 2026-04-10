import { type Request, type Response, type NextFunction } from 'express';
import { type ZodSchema } from 'zod';
import { ValidationError } from '../errors/AppError';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      return next(new ValidationError(message));
    }
    req.body = result.data;
    next();
  };
}
