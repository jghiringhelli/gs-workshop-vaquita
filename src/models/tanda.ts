import { z } from 'zod';

export const TandaStatus = z.enum(['forming', 'active', 'completed', 'cancelled']);

export const TandaSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  organizerId: z.string().uuid(),
  contributionAmount: z.number().positive(),
  status: TandaStatus,
  currentRound: z.number().int().nonnegative(),
  totalRounds: z.number().int().positive(),
  createdAt: z.date(),
});

export const CreateTandaSchema = z.object({
  name: z.string().min(1),
  organizerId: z.string().uuid(),
  contributionAmount: z.number().positive(),
  totalRounds: z.number().int().positive(),
});

export type Tanda = z.infer<typeof TandaSchema>;
export type CreateTandaRequest = z.infer<typeof CreateTandaSchema>;
