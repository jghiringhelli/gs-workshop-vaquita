import { z } from 'zod';

export const ContributionStatus = z.enum(['pending', 'paid', 'late', 'missed']);

export const ContributionSchema = z.object({
  id: z.string().uuid(),
  tandaId: z.string().uuid(),
  participantId: z.string().uuid(),
  round: z.number().int().positive(),
  amount: z.number().positive(),
  status: ContributionStatus,
  paidAt: z.date().nullable(),
  createdAt: z.date(),
});

export const RecordContributionSchema = z.object({
  participantId: z.string().uuid(),
  amount: z.number().positive(),
  isLate: z.boolean().optional().default(false),
});

export type Contribution = z.infer<typeof ContributionSchema>;
export type RecordContributionRequest = z.infer<typeof RecordContributionSchema>;

export const RoundSummarySchema = z.object({
  round: z.number().int().positive(),
  contributions: z.array(ContributionSchema),
  totalCollected: z.number(),
  recipientParticipantId: z.string().uuid(),
});

export type RoundSummary = z.infer<typeof RoundSummarySchema>;
