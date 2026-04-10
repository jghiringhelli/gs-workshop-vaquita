import { z } from 'zod';

/** Schema for POST /api/users request body. */
export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
});

/** Schema for :id path parameter when referencing a user. */
export const userIdParamSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
