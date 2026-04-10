import { z } from 'zod';

export const RecordContributionSchema = z.object({
  participantId: z.string().uuid('participantId must be a valid UUID'),
  amount: z.number().positive('amount must be a positive number'),
});

export type RecordContributionInput = z.infer<typeof RecordContributionSchema>;
