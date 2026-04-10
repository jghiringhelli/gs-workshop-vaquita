import { Router } from "express";
import { z } from "zod";

import { validateBody, validateParams, validateQuery } from "../../validation/validate";
import { usersService } from "./users.service";

const createUserBodySchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(100),
});

const listUsersQuerySchema = z.object({}).strict();

const userIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const usersRouter = Router();

usersRouter.post("/users", validateBody(createUserBodySchema), (request, response) => {
  const user = usersService.createUser(request.body as z.infer<typeof createUserBodySchema>);
  response.status(201).json(user);
});

usersRouter.get("/users", validateQuery(listUsersQuerySchema), (_request, response) => {
  response.status(200).json(usersService.listUsers());
});

usersRouter.get("/users/:id", validateParams(userIdParamsSchema), (request, response) => {
  response.status(200).json(usersService.getUserById(Number(request.params.id)));
});