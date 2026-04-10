import { Router } from "express";

import { parseWithSchema } from "../../../shared/http/validation";
import type { UserService } from "../application/UserService";
import { createUserBodySchema, userIdParamSchema } from "./userSchemas";

/**
 * Create the router responsible for user endpoints.
 *
 * @param userService The user service dependency.
 * @returns The configured Express router.
 */
export function createUserRouter(userService: UserService): Router {
  const router = Router();

  router.post("/", (request, response): void => {
    const body = parseWithSchema(createUserBodySchema, request.body);
    const user = userService.createUser(body);
    response.status(201).json(user);
  });

  router.get("/", (_request, response): void => {
    response.json(userService.listUsers());
  });

  router.get("/:id", (request, response): void => {
    const params = parseWithSchema(userIdParamSchema, request.params);
    response.json(userService.getUserById(params.id));
  });

  return router;
}
