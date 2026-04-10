import { z } from 'zod';

/**
 * Zod schema for POST /api/tandas/:id/contributions request body.
 * The round is taken from tanda.currentRound server-side — not supplied by the caller.
 */
export const recordContributionSchema = z.object({
  userId: z.string().uuid({ message: 'userId must be a valid UUID' }),
  amount: z
    .number({ invalid_type_error: 'amount must be a number' })
    .positive({ message: 'amount must be greater than zero' }),
});

/**
 * Zod schema for GET /api/tandas/:id/rounds/:round route params.
 * Coerces the string param to a positive integer.
 */
export const roundParamsSchema = z.object({
  id: z.string().uuid({ message: 'id must be a valid UUID' }),
  round: z.coerce
    .number({ invalid_type_error: 'round must be a number' })
    .int({ message: 'round must be an integer' })
    .positive({ message: 'round must be a positive integer' }),
});

export type RecordContributionInput = z.infer<typeof recordContributionSchema>;
export type RoundParams = z.infer<typeof roundParamsSchema>;
