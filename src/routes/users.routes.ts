import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../http/async-handler";
import type { AppContext } from "../types/app-context";
import { UsersRepository } from "../users/users.repository";
import { UsersService } from "../users/users.service";

const createUserSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(120),
});

const userIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export function createUsersRouter(context: AppContext): Router {
  const router = Router();
  const usersService = new UsersService(new UsersRepository(context.db));

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const input = createUserSchema.parse(req.body);
      const user = usersService.createUser(input);

      res.status(201).json(user);
    }),
  );

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      res.json(usersService.listUsers());
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const params = userIdParamsSchema.parse(req.params);
      const user = usersService.getUserById(params.id);

      res.json(user);
    }),
  );

  return router;
}
