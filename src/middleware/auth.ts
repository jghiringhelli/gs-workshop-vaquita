import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../errors';
import { JwtPayload, verifyToken } from '../lib/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }
  const token = authHeader.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
