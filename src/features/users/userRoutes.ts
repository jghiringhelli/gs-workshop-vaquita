import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";

import type { UserService } from "./userService";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(100),
});

const userIdSchema = z.coerce.number().int().positive();

/**
 * Create the user router.
 *
 * @param userService User application service.
 * @returns Configured Express router.
 */
export function createUserRouter(userService: UserService): Router {
  const router = Router();

  router.post("/api/users", asyncHandler(async (request, response) => {
    const input = createUserSchema.parse(request.body);
    const user = userService.createUser(input);
    response.status(201).json(user);
  }));

  router.get("/api/users", asyncHandler(async (_request, response) => {
    response.json(userService.listUsers());
  }));

  router.get("/api/users/:id", asyncHandler(async (request, response) => {
    const userId = userIdSchema.parse(request.params.id);
    response.json(userService.getUserById(userId));
  }));

  return router;
}

/**
 * Wrap an Express handler so errors flow to middleware.
 *
 * @param handler Route handler to wrap.
 * @returns Wrapped request handler.
 */
function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<void> | void,
): (request: Request, response: Response, next: NextFunction) => void {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}
