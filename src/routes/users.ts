import { Router } from "express";
import { z } from "zod";
import { UserService } from "../services/user.service";
import { validateBody, validateParams } from "../middleware/validation";

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
});

const IdentifierParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * Creates user routes.
 * @param userService Service instance.
 * @returns Router with user endpoints.
 */
export function createUserRouter(userService: UserService): Router {
  const router = Router();

  router.post("/", validateBody(CreateUserSchema), (request, response) => {
    const createdUser = userService.create(request.body);
    response.status(201).json(createdUser);
  });

  router.get("/", (_request, response) => {
    response.status(200).json(userService.list());
  });

  router.get("/:id", validateParams(IdentifierParamsSchema), (request, response) => {
    const user = userService.getById(Number(request.params.id));
    response.status(200).json(user);
  });

  return router;
}
