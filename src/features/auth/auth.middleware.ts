import type { RequestHandler } from "express";
import type { Request } from "express";

import { UnauthorizedError } from "../../lib/errors";

import type { AuthService } from "./auth.service";
import type { AuthenticatedUser } from "./auth.types";

interface AuthenticatedRequest extends Request {
  auth?: AuthenticatedUser;
}

export function createRequireAuthenticatedUser(authService: AuthService): RequestHandler {
  return (request, _response, next): void => {
    try {
      const authorizationHeader = request.header("authorization");
      if (!authorizationHeader) {
        throw new UnauthorizedError("Authorization header is required.");
      }

      const [scheme, token] = authorizationHeader.split(" ");
      if (scheme !== "Bearer" || !token) {
        throw new UnauthorizedError("Authorization header must use Bearer token format.");
      }

      (request as AuthenticatedRequest).auth = authService.verifyAccessToken(token);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function getAuthenticatedUser(request: Express.Request): AuthenticatedUser {
  const authenticatedRequest = request as AuthenticatedRequest;
  if (!authenticatedRequest.auth) {
    throw new UnauthorizedError("Authenticated user context is missing.");
  }

  return authenticatedRequest.auth;
}