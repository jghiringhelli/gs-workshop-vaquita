import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  name: z.string().min(1, 'Name is required'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
