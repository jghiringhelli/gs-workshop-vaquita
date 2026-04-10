import { z } from 'zod';

/** Schema for POST /api/tandas request body. */
export const createTandaSchema = z.object({
  name: z.string().min(1, 'Tanda name is required').max(100),
  contributionAmount: z.number().positive('Contribution amount must be positive'),
});

/** Schema for path parameter carrying a tanda ID. */
export const tandaIdParamSchema = z.object({
  id: z.string().uuid('Invalid tanda ID'),
});

/** Schema for path parameters carrying a tanda ID and a round number. */
export const tandaRoundParamSchema = z.object({
  id: z.string().uuid('Invalid tanda ID'),
  round: z.coerce.number().int().positive('Round must be a positive integer'),
});

/** Schema for path parameters carrying a tanda ID and a participant ID. */
export const participantParamSchema = z.object({
  id: z.string().uuid('Invalid tanda ID'),
  pid: z.string().uuid('Invalid participant ID'),
});

/** Schema for GET /api/tandas query string. */
export const listTandasQuerySchema = z.object({
  userId: z.string().uuid('Invalid userId').optional(),
});

export type CreateTandaInput = z.infer<typeof createTandaSchema>;
