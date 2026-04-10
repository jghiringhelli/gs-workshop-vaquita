import { Router, type RequestHandler, type Router as ExpressRouter } from "express";

import type { AuthService } from "./auth.service";
import { issueTokenBodySchema } from "./auth.schemas";

export function createAuthRouter(authService: AuthService): ExpressRouter {
  const router = Router();

  router.post("/token", issueTokenHandler(authService));

  return router;
}

function issueTokenHandler(authService: AuthService): RequestHandler {
  return (request, response, next): void => {
    try {
      const input = issueTokenBodySchema.parse(request.body);
      const authToken = authService.issueToken(input);
      response.status(200).json(authToken);
    } catch (error) {
      next(error);
    }
  };
}