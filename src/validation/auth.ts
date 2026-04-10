import { z } from 'zod';

export const GetTokenSchema = z.object({
  email: z.string().email('Must be a valid email address'),
});

export type GetTokenInput = z.infer<typeof GetTokenSchema>;
