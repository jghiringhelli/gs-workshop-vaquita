import { z } from 'zod'

export const createTandaSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  purpose: z.string().optional(),
  contributionAmount: z.number().int().positive('Contribution amount must be positive'),
  totalRounds: z.number().int().min(1, 'At least 1 round required'),
  targetAmount: z.number().int().positive('Target amount must be positive').optional(),
})

export const inviteParticipantSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
})

export const recordContributionSchema = z.object({
  amountCents: z.number().int().positive('Amount must be positive'),
  note: z.string().optional(),
})

export type CreateTandaInput = z.infer<typeof createTandaSchema>
export type InviteParticipantInput = z.infer<typeof inviteParticipantSchema>
export type RecordContributionInput = z.infer<typeof recordContributionSchema>
