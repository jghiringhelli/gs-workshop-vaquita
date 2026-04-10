import type { NextFunction, Request, Response } from "express";

import { ForbiddenError, UnauthorizedError } from "../errors/app-error";
import { AuthService } from "../services/auth-service";

export function requireAuth(authService: AuthService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.header("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      next(new UnauthorizedError("Missing Bearer token"));
      return;
    }

    const token = authHeader.replace("Bearer ", "").trim();

    try {
      const userId = authService.verifyToken(token);
      res.locals.authUserId = userId;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireSameUserAction(
  authenticatedUserId: number,
  requestedUserId: number
): void {
  if (authenticatedUserId !== requestedUserId) {
    throw new ForbiddenError("Authenticated user cannot perform this action");
  }
}
