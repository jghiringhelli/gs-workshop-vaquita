import { z } from 'zod'

export const createWithdrawalSchema = z.object({
  amountCents: z.number().int().positive('Amount must be positive'),
  reason: z.string().optional(),
  receiptUrl: z.string().url('Receipt URL must be a valid URL').optional().or(z.literal('')),
})

export const voteOnWithdrawalSchema = z.object({
  vote: z.enum(['approve', 'reject'], {
    errorMap: () => ({ message: 'Vote must be "approve" or "reject"' }),
  }),
})

export type CreateWithdrawalInput = z.infer<typeof createWithdrawalSchema>
export type VoteOnWithdrawalInput = z.infer<typeof voteOnWithdrawalSchema>
