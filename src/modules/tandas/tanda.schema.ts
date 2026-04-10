import { z } from 'zod';

/** Schema for POST /api/tandas */
export const CreateTandaSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  organizerId: z.string().uuid('organizerId must be a valid UUID'),
  contributionAmount: z.number().positive('Contribution amount must be positive'),
});

/** Schema for POST /api/tandas/:id/join */
export const JoinTandaSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
});

/** Schema for POST /api/tandas/:id/start */
export const StartTandaSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
});

/** Schema for POST /api/tandas/:id/cancel */
export const CancelTandaSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
});

/** Schema for POST /api/tandas/:id/contributions */
export const RecordContributionSchema = z.object({
  participantId: z.string().uuid('participantId must be a valid UUID'),
  amount: z.number().positive('Amount must be positive'),
});

/** Schema for POST /api/tandas/:id/advance */
export const AdvanceRoundSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
});

export type CreateTandaDto = z.infer<typeof CreateTandaSchema>;
export type JoinTandaDto = z.infer<typeof JoinTandaSchema>;
export type StartTandaDto = z.infer<typeof StartTandaSchema>;
export type CancelTandaDto = z.infer<typeof CancelTandaSchema>;
export type RecordContributionDto = z.infer<typeof RecordContributionSchema>;
export type AdvanceRoundDto = z.infer<typeof AdvanceRoundSchema>;

