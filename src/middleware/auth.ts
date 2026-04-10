import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../errors';

/** Augments the Express Request type to include the authenticated userId. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

/**
 * Express middleware that verifies a JWT Bearer token.
 *
 * Reads the `Authorization: Bearer <token>` header, verifies the signature
 * using JWT_SECRET, and attaches the decoded `userId` (from the `sub` claim)
 * to `req.userId`.
 *
 * Calls `next(UnauthorizedError)` if the token is missing, malformed, or invalid.
 *
 * @param req - Express request object.
 * @param _res - Express response object (unused).
 * @param next - Express next function.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    next(new UnauthorizedError('Authorization header missing or malformed'));
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; email: string };
    req.userId = payload.sub;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
