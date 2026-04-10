import { z } from "zod";

export const tandaStatusSchema = z.enum([
  "forming",
  "active",
  "completed",
  "cancelled",
]);

export type TandaStatus = z.infer<typeof tandaStatusSchema>;

export const tandaSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1),
  organizerId: z.number().int().positive(),
  contributionAmount: z.number().positive(),
  status: tandaStatusSchema,
  currentRound: z.number().int().nonnegative(),
  totalRounds: z.number().int().nonnegative(),
});

export type Tanda = z.infer<typeof tandaSchema>;

export const createTandaInputSchema = tandaSchema.omit({
  id: true,
  status: true,
  currentRound: true,
  totalRounds: true,
});

export type CreateTandaInput = z.infer<typeof createTandaInputSchema>;