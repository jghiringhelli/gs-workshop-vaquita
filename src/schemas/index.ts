import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100),
});

export const createTandaSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  organizerId: z.string().uuid('Invalid organizer ID'),
  contributionAmount: z.number().positive('Contribution amount must be positive'),
});

export const joinTandaSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

export const organizerActionSchema = z.object({
  organizerId: z.string().uuid('Invalid organizer ID'),
});

export const recordContributionSchema = z.object({
  participantId: z.string().uuid('Invalid participant ID'),
  status: z.enum(['paid', 'late', 'missed']).optional().default('paid'),
});
