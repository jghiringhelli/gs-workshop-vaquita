import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { userService } from "../services/userService.js";
import { createUserSchema } from "../validators/schemas.js";
import { ValidationError } from "../errors/index.js";

const router = Router();

router.post("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const user = userService.createUser(parsed.data.email, parsed.data.name);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.get("/", (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = userService.getUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      throw new ValidationError("Invalid user ID");
    }

    const user = userService.getUserById(id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
