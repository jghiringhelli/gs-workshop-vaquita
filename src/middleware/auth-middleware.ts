import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../errors/app-error";
import type { AuthService } from "../services/auth-service";

/**
 * Returns middleware that verifies a Bearer token on every protected request.
 * On success, sets res.locals.authUserId to the authenticated user id.
 * @param authService - AuthService instance
 */
export function requireAuth(authService: AuthService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.header("authorization");
    if (!header?.startsWith("Bearer ")) {
      next(new UnauthorizedError("Missing Bearer token"));
      return;
    }
    try {
      const token = header.replace("Bearer ", "").trim();
      res.locals.authUserId = authService.verifyToken(token);
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Throws ForbiddenError if the authenticated user differs from the requested actor.
 * @param authUserId - id from JWT
 * @param requestedUserId - id from request body
 */
export function requireSameUser(authUserId: number, requestedUserId: number): void {
  if (authUserId !== requestedUserId) {
    throw new ForbiddenError("Authenticated user cannot perform this action");
  }
}
