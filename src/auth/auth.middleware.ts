import type { NextFunction, Request, RequestHandler, Response } from "express";

import { UnauthorizedError } from "../errors/app-error";
import { UsersRepository } from "../repositories/users.repository";
import type { AppContext } from "../types/app-context";
import { AuthService } from "./auth.service";
import type { AuthenticatedUser } from "./auth.types";

export function requireAuth(context: AppContext): RequestHandler {
  const authService = new AuthService(new UsersRepository(context.db), context.config);

  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.header("authorization");

    if (!header) {
      next(new UnauthorizedError("Authorization header is required"));
      return;
    }

    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      next(new UnauthorizedError("Authorization header must use Bearer token format"));
      return;
    }

    try {
      req.auth = authService.authenticateToken(token);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function getAuthenticatedUser(req: Request): AuthenticatedUser {
  if (!req.auth) {
    throw new UnauthorizedError("Authentication is required");
  }

  return req.auth;
}
