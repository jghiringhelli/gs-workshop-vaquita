import { z } from 'zod';

// User schemas
export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  created_at: z.string(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

// Tanda schemas
export const createTandaSchema = z.object({
  name: z.string().min(1, 'Tanda name is required'),
  organizerId: z.string().min(1, 'Organizer ID is required'),
  contributionAmount: z.number().positive('Contribution amount must be positive'),
  totalRounds: z.number().int().positive('Total rounds must be a positive integer'),
});

export type CreateTandaInput = z.infer<typeof createTandaSchema>;

export const tandaResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  organizerId: z.string(),
  contributionAmount: z.number(),
  status: z.enum(['forming', 'active', 'completed', 'cancelled']),
  currentRound: z.number(),
  totalRounds: z.number(),
  created_at: z.string(),
});

export type TandaResponse = z.infer<typeof tandaResponseSchema>;

// Participant schemas
export const participantResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tandaId: z.string(),
  role: z.enum(['organizer', 'member']),
  rotationPosition: z.number().nullable(),
  consecutiveMissed: z.number(),
  isDefaulter: z.boolean(),
  created_at: z.string(),
});

export type ParticipantResponse = z.infer<typeof participantResponseSchema>;

// Contribution schemas
export const recordContributionSchema = z.object({
  participantId: z.string().min(1, 'Participant ID is required'),
  amount: z.number().positive('Amount must be positive'),
});

export type RecordContributionInput = z.infer<typeof recordContributionSchema>;

export const contributionResponseSchema = z.object({
  id: z.string(),
  tandaId: z.string(),
  participantId: z.string(),
  round: z.number(),
  amount: z.number(),
  status: z.enum(['pending', 'paid', 'late', 'missed']),
  penaltyApplied: z.number(),
  paidAt: z.string().nullable(),
  created_at: z.string(),
});

export type ContributionResponse = z.infer<typeof contributionResponseSchema>;
