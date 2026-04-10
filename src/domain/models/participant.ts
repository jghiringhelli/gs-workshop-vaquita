import { z } from "zod";

export const participantRoleSchema = z.enum(["organizer", "member"]);

export type ParticipantRole = z.infer<typeof participantRoleSchema>;

export const participantSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  tandaId: z.number().int().positive(),
  role: participantRoleSchema,
  rotationPosition: z.number().int().positive().nullable(),
});

export type Participant = z.infer<typeof participantSchema>;

export const createParticipantInputSchema = participantSchema.omit({ id: true });

export type CreateParticipantInput = z.infer<typeof createParticipantInputSchema>;