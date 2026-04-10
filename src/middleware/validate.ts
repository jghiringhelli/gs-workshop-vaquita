import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Middleware factory that validates a section of the incoming request against a Zod schema.
 * On failure, responds 422 with a list of field-level errors.
 * On success, replaces the target with the parsed (coerced) value and calls next().
 *
 * @param schema - Zod schema to validate against
 * @param target - Part of the request to validate (default: 'body')
 * @returns Express middleware
 */
export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      res.status(422).json({
        errors: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    if (target === 'body') req.body = result.data;
    else if (target === 'query') req.query = result.data as Request['query'];
    else if (target === 'params') req.params = result.data as Request['params'];

    next();
  };
}
