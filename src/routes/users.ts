import { Router } from "express";
import { z } from "zod";
import { ValidationError } from "../errors";
import { UserService } from "../services/userService";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1),
});

const parsePositiveInteger = (value: string, label: string): number => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`${label} must be a positive integer.`);
  }

  return parsed;
};

export const createUserRouter = (userService: UserService): Router => {
  const router = Router();

  router.post("/", (req, res) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid request body.", parsed.error.flatten());
    }

    const user = userService.createUser(parsed.data);
    res.status(201).json(user);
  });

  router.get("/", (_req, res) => {
    res.json(userService.listUsers());
  });

  router.get("/:id", (req, res) => {
    const id = parsePositiveInteger(req.params.id, "User id");
    res.json(userService.getUserById(id));
  });

  return router;
};
