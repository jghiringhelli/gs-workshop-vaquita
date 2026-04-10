import { z } from "zod";

export const userIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listUsersQuerySchema = z.object({}).strict();

export const createUserBodySchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(120),
});