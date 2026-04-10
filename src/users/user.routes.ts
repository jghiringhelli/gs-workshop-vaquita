import { Router } from "express";
import { z } from "zod";
import type { UserService } from "./user.service.js";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

/**
 * Mounts user routes onto an Express Router.
 * @param userService - The UserService instance to delegate to.
 * @returns Configured Express Router.
 */
export function createUserRouter(userService: UserService): Router {
  const router = Router();

  router.post("/", (req, res, next) => {
    try {
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
        return;
      }
      const user = userService.create(parsed.data);
      res.status(201).json({ data: user });
    } catch (err) {
      next(err);
    }
  });

  router.get("/", (_req, res, next) => {
    try {
      const users = userService.list();
      res.json({ data: users });
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id", (req, res, next) => {
    try {
      const user = userService.findById(req.params["id"] ?? "");
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
