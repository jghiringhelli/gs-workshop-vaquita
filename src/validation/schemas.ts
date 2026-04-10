import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

export const createTandaSchema = z.object({
  name: z.string().min(1, 'Tanda name is required').max(100, 'Name too long'),
  organizerId: z.number().int().positive('Organizer ID must be a positive integer'),
  contributionAmount: z.number().int().positive('Contribution amount must be positive'),
});

export const joinTandaSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer'),
});

export const recordContributionSchema = z.object({
  participantId: z.number().int().positive('Participant ID must be a positive integer'),
  amount: z.number().int().positive('Amount must be positive'),
});

export const userIdQuerySchema = z.object({
  userId: z.string().regex(/^\d+$/, 'User ID must be a number').transform(Number),
});

export const tandaIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Tanda ID must be a number').transform(Number),
});

export const roundParamSchema = z.object({
  round: z.string().regex(/^\d+$/, 'Round must be a number').transform(Number),
});

export const participantIdParamSchema = z.object({
  pid: z.string().regex(/^\d+$/, 'Participant ID must be a number').transform(Number),
});
