import { z } from "zod";

export const userSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().trim().email(),
  name: z.string().trim().min(1),
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = userSchema.omit({ id: true });

export type CreateUserInput = z.infer<typeof createUserInputSchema>;