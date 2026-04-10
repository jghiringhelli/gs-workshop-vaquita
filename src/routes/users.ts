import { Router } from "express";
import { z } from "zod";
import { userService } from "../services/userService";

export const usersRouter = Router();

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

usersRouter.post("/", (req, res, next) => {
  try {
    const body = CreateUserSchema.parse(req.body);
    const user = userService.create(body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

usersRouter.get("/", (_req, res, next) => {
  try {
    const users = userService.listAll();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

usersRouter.get("/:id", (req, res, next) => {
  try {
    const user = userService.getById(req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});
