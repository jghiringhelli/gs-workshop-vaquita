import { z } from "zod";

export const contributionStatusSchema = z.enum([
  "pending",
  "paid",
  "late",
  "missed",
]);

export type ContributionStatus = z.infer<typeof contributionStatusSchema>;

export const contributionSchema = z.object({
  id: z.number().int().positive(),
  tandaId: z.number().int().positive(),
  participantId: z.number().int().positive(),
  round: z.number().int().positive(),
  amount: z.number().positive(),
  status: contributionStatusSchema,
});

export type Contribution = z.infer<typeof contributionSchema>;

export const createContributionInputSchema = contributionSchema.omit({ id: true });

export type CreateContributionInput = z.infer<typeof createContributionInputSchema>;