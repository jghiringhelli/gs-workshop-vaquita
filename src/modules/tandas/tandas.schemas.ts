import { z } from 'zod';

export const CreateTandaSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contributionAmount: z.number().positive('contributionAmount must be positive'),
  organizerId: z.string().uuid('organizerId must be a valid UUID'),
});

export const JoinTandaSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
});

export const OrganizerActionSchema = z.object({
  organizerId: z.string().uuid('organizerId must be a valid UUID'),
});

export type CreateTandaInput = z.infer<typeof CreateTandaSchema>;
export type JoinTandaInput = z.infer<typeof JoinTandaSchema>;
export type OrganizerActionInput = z.infer<typeof OrganizerActionSchema>;
