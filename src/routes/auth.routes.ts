import { Router } from "express";
import { z } from "zod";

import { AuthService } from "../auth/auth.service";
import { asyncHandler } from "../http/async-handler";
import type { AppContext } from "../types/app-context";
import { UsersRepository } from "../users/users.repository";

const issueTokenSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

export function createAuthRouter(context: AppContext): Router {
  const router = Router();
  const authService = new AuthService(new UsersRepository(context.db), context.config);

  router.post(
    "/token",
    asyncHandler(async (req, res) => {
      const input = issueTokenSchema.parse(req.body);
      const token = authService.issueTokenForUser(input.userId);

      res.json(token);
    }),
  );

  return router;
}
