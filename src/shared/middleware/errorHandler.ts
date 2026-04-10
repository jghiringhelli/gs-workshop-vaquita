import { Request, Response, NextFunction } from 'express';
import { AppError } from '../exceptions';

/**
 * Express error-handling middleware. Maps AppError subclasses to structured JSON
 * responses and falls back to 500 for unexpected errors.
 *
 * @param err - The error thrown or passed to next().
 * @param _req - Express request (unused).
 * @param res - Express response.
 * @param _next - Express next function (required by Express signature).
 * @returns void
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res
      .status(err.statusCode)
      .json({ error: { code: err.code, message: err.message } });
    return;
  }
  console.error(err);
  res
    .status(500)
    .json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}
