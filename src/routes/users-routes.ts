import { Router } from "express";
import { z } from "zod";
import { createUserInputSchema } from "../domain/models";
import { ValidationError } from "../errors/app-error";
import { userService } from "../services/user-service";

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

export const usersRouter = Router();

usersRouter.post("/", (req, res) => {
  const parsed = createUserInputSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError("Invalid user payload", parsed.error.flatten());
  }

  const user = userService.create(parsed.data);
  res.status(201).json(user);
});

usersRouter.get("/", (_req, res) => {
  const users = userService.list();
  res.json(users);
});

usersRouter.get("/:id", (req, res) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError("Invalid user id", parsed.error.flatten());
  }

  const user = userService.getById(parsed.data.id);
  res.json(user);
});
