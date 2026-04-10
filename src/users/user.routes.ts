import { Router } from "express";

import { createUserSchema, userIdParamsSchema } from "./user.schemas";
import { UserService } from "./user.service";

interface UserRouterDependencies {
  userService: UserService;
}

export function createUserRouter({ userService }: UserRouterDependencies): Router {
  const router = Router();

  router.post("/", (request, response) => {
    const input = createUserSchema.parse(request.body);
    const user = userService.createUser(input);

    response.status(201).json(user);
  });

  router.get("/", (_request, response) => {
    response.json(userService.listUsers());
  });

  router.get("/:id", (request, response) => {
    const { id } = userIdParamsSchema.parse(request.params);
    const user = userService.getUserById(id);

    response.json(user);
  });

  return router;
}
