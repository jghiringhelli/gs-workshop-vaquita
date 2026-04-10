import { z } from 'zod';

/** Schema for POST /api/users */
export const CreateUserSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  name: z.string().min(1, 'Name is required').max(100),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;

