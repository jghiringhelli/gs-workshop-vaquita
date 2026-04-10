import { z } from "zod";

export const tandaIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const participantHistoryParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  pid: z.coerce.number().int().positive(),
}).strict();

export const roundSummaryParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  round: z.coerce.number().int().positive(),
});

export const createTandaBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  organizerId: z.coerce.number().int().positive(),
  contributionAmount: z.coerce.number().int().positive(),
});

export const listTandasQuerySchema = z.object({
  userId: z.coerce.number().int().positive(),
}).strict();

export const joinTandaBodySchema = z.object({
  userId: z.coerce.number().int().positive(),
}).strict();

export const organizerActionBodySchema = z.object({
  organizerId: z.coerce.number().int().positive(),
}).strict();

export const recordContributionBodySchema = z.object({
  participantId: z.coerce.number().int().positive(),
  amount: z.coerce.number().int().positive(),
}).strict();