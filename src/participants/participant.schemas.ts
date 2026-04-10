import { z } from 'zod';

/** Zod schema for POST /api/tandas/:id/join request body. */
export const joinTandaSchema = z.object({
  userId: z.string().uuid({ message: 'userId must be a valid UUID' }),
});

export type JoinTandaInput = z.infer<typeof joinTandaSchema>;
