import { z } from "zod";

export const createTandaSchema = z.object({
  name: z.string().trim().min(1).max(100),
  organizerId: z.coerce.number().int().positive(),
  contributionAmount: z.coerce.number().int().positive(),
});

export const listTandasQuerySchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
});

export const tandaIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const joinTandaSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

export const organizerActionSchema = z
  .object({
    userId: z.coerce.number().int().positive().optional(),
    organizerId: z.coerce.number().int().positive().optional(),
  })
  .refine((input) => input.userId !== undefined || input.organizerId !== undefined, {
    message: "userId or organizerId is required",
  })
  .transform((input) => ({
    actorUserId: input.userId ?? input.organizerId ?? 0,
  }));

export const recordContributionSchema = z
  .object({
    participantId: z.coerce.number().int().positive(),
    status: z.enum(["paid", "late"]).optional(),
    isLate: z.boolean().optional(),
  })
  .transform((input) => ({
    participantId: input.participantId,
    isLate: input.isLate ?? input.status === "late",
  }));

export const roundParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  round: z.coerce.number().int().positive(),
});

export const participantHistoryParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  pid: z.coerce.number().int().positive(),
});
