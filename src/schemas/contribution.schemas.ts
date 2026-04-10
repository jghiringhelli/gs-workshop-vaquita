import { z } from 'zod';

export const createContributionSchema = z.object({
  participantId: z.number().int().positive().optional(),
  amount: z.number().int().positive().optional(),
  status: z.enum(['pending', 'paid', 'late', 'missed']).optional(),
});

export type CreateContributionInput = z.infer<typeof createContributionSchema>;
