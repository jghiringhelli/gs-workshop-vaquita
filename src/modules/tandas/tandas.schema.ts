import { z } from 'zod';

export const CreateTandaSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  contributionAmount: z.number().positive('Contribution amount must be positive'),
  totalRounds: z.number().int().min(3, 'totalRounds must be at least 3'),
});

export const RecordContributionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
});

export type CreateTandaDto = z.infer<typeof CreateTandaSchema>;
export type RecordContributionDto = z.infer<typeof RecordContributionSchema>;
