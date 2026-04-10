import { z } from "zod";

export const createUserBodySchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(100),
});

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
