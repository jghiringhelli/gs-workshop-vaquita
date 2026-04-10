import { z } from "zod";

export const tandaIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const roundSummaryParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  round: z.coerce.number().int().positive(),
});

export const participantHistoryParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  pid: z.coerce.number().int().positive(),
});

export const createTandaBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  organizerId: z.coerce.number().int().positive(),
  contributionAmount: z.coerce.number().int().positive(),
});

export const listTandasQuerySchema = z.object({
  userId: z.coerce.number().int().positive(),
});

export const joinTandaBodySchema = z.object({
  userId: z.coerce.number().int().positive(),
});

export const contributionBodySchema = z.object({
  participantId: z.coerce.number().int().positive(),
  amount: z.coerce.number().int().positive(),
});

const requesterCarrierSchema = z
  .object({
    requesterUserId: z.coerce.number().int().positive().optional(),
    userId: z.coerce.number().int().positive().optional(),
    organizerId: z.coerce.number().int().positive().optional(),
  })
  .refine(
    (value) =>
      value.requesterUserId !== undefined || value.userId !== undefined || value.organizerId !== undefined,
    {
      message: "A requester user ID is required",
      path: ["requesterUserId"],
    },
  );

export type RequesterCarrier = z.infer<typeof requesterCarrierSchema>;
export const requesterBodySchema = requesterCarrierSchema;

/**
 * Extract the requester user ID from a validated requester payload.
 *
 * @param requesterCarrier The validated requester payload.
 * @returns The resolved requester user ID.
 */
export function getRequesterUserId(requesterCarrier: RequesterCarrier): number {
  return (
    requesterCarrier.requesterUserId ??
    requesterCarrier.userId ??
    requesterCarrier.organizerId ??
    0
  );
}
