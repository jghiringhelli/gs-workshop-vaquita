import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
