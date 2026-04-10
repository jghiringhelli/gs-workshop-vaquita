import { z } from 'zod';

const TANDA_NAME_REGEX = /^[a-zA-ZÀ-ÿ0-9]+([ \-][a-zA-ZÀ-ÿ0-9]+)*$/;

export const CreateTandaSchema = z.object({
  name: z
    .string()
    .min(1, 'Tanda name is required')
    .regex(TANDA_NAME_REGEX, 'Tanda name may only contain letters, numbers, spaces, and hyphens'),
  organizerId: z.string().uuid('organizerId must be a valid UUID'),
  contributionAmount: z.number().positive('Contribution amount must be positive'),
});

export const JoinTandaSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
});

export const RecordContributionSchema = z.object({
  participantId: z.string().uuid('participantId must be a valid UUID'),
  amount: z.number().positive('Amount must be positive'),
  status: z.enum(['paid', 'late']),
});

export type CreateTandaDto = z.infer<typeof CreateTandaSchema>;
export type JoinTandaDto = z.infer<typeof JoinTandaSchema>;
export type RecordContributionDto = z.infer<typeof RecordContributionSchema>;
