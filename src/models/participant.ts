import { z } from 'zod';

export const ParticipantRole = z.enum(['organizer', 'member']);

export const ParticipantSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  tandaId: z.string().uuid(),
  role: ParticipantRole,
  rotationPosition: z.number().int().nonnegative(),
});

export const JoinTandaSchema = z.object({
  userId: z.string().uuid(),
});

export type Participant = z.infer<typeof ParticipantSchema>;
export type JoinTandaRequest = z.infer<typeof JoinTandaSchema>;
