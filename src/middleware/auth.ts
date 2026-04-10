import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { EnvironmentConfig } from "../config/env";
import { UnauthorizedError } from "../errors/app-error";

export interface AuthenticatedRequest extends Request {
  authenticatedUserId?: number;
}

/**
 * Builds JWT authentication middleware for protected routes.
 * @param config Validated environment configuration.
 * @returns Express middleware that validates bearer tokens.
 */
export function createAuthMiddleware(config: EnvironmentConfig) {
  return function authMiddleware(
    request: AuthenticatedRequest,
    _response: Response,
    next: NextFunction,
  ): void {
    const authorizationHeader = request.headers.authorization;
    if (!authorizationHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing bearer token");
    }

    const token = authorizationHeader.slice(7);
    const payload = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload;
    const subject = payload.sub;
    if (typeof subject !== "string") {
      throw new UnauthorizedError("Token subject is invalid");
    }

    const userId = Number(subject);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedError("Token subject must be a positive integer");
    }

    request.authenticatedUserId = userId;
    next();
  };
}
