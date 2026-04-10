import { z } from 'zod';

/** Zod schema for POST /api/users request body. */
export const createUserSchema = z.object({
  email: z.string().email({ message: 'Must be a valid email address' }),
  name: z.string().min(1, { message: 'Name is required' }).max(100, { message: 'Name must be 100 characters or fewer' }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
