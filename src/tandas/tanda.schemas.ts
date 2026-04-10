import { z } from 'zod';

/** Zod schema for POST /api/tandas request body. */
export const createTandaSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }).max(100, { message: 'Name must be 100 characters or fewer' }),
  organizerId: z.string().uuid({ message: 'organizerId must be a valid UUID' }),
  contributionAmount: z
    .number({ invalid_type_error: 'contributionAmount must be a number' })
    .positive({ message: 'contributionAmount must be greater than zero' }),
});

/** Zod schema for GET /api/tandas query parameters. */
export const listTandasQuerySchema = z.object({
  userId: z.string().min(1, { message: 'userId query parameter is required' }),
});

/** Zod schema for POST /api/tandas/:id/start request body. */
export const startTandaSchema = z.object({
  requesterId: z.string().uuid({ message: 'requesterId must be a valid UUID' }),
});

/** Zod schema for POST /api/tandas/:id/cancel request body. */
export const cancelTandaSchema = z.object({
  requesterId: z.string().uuid({ message: 'requesterId must be a valid UUID' }),
});

export type CreateTandaInput = z.infer<typeof createTandaSchema>;
export type ListTandasQuery = z.infer<typeof listTandasQuerySchema>;
export type StartTandaInput = z.infer<typeof startTandaSchema>;
export type CancelTandaInput = z.infer<typeof cancelTandaSchema>;
