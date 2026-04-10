import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Factory that returns an Express middleware validating `req.body` against a Zod schema.
 * On failure it short-circuits with a 400 VALIDATION_ERROR response.
 * On success it replaces `req.body` with the parsed (coerced) value.
 *
 * @param schema - Zod schema to validate against.
 * @returns Express middleware function.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message } });
      return;
    }
    req.body = result.data;
    next();
  };
}
