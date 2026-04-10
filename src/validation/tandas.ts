import { z } from 'zod';

export const CreateTandaSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
  contributionAmount: z.number({ required_error: 'contributionAmount is required' }).positive('Contribution amount must be positive'),
});

export type CreateTandaInput = z.infer<typeof CreateTandaSchema>;
