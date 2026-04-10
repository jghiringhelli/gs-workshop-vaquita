import { z } from 'zod';

export const createTandaSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contributionAmount: z.number().int().positive('Contribution amount must be positive'),
  totalRounds: z.number().int().positive().optional(),
  organizerId: z.number().int().positive().optional(),
});

export type CreateTandaInput = z.infer<typeof createTandaSchema>;
