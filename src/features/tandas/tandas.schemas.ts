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
  contributionAmount: z.coerce.number().int().positive(),
});

export const listTandasQuerySchema = z.object({}).strict();

export const joinTandaBodySchema = z.object({}).strict();

export const organizerActionBodySchema = z.object({}).strict();

export const recordContributionBodySchema = z.object({
  amount: z.coerce.number().int().positive(),
  round: z.coerce.number().int().positive().optional(),
}).strict();