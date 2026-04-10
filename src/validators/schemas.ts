import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().min(1, "Name is required"),
});

export const createTandaSchema = z.object({
  name: z.string().min(1, "Name is required"),
  organizerId: z.number().int().positive("Organizer ID must be a positive integer"),
  contributionAmount: z.number().positive("Contribution amount must be positive"),
});

export const joinTandaSchema = z.object({
  userId: z.number().int().positive("User ID must be a positive integer"),
});

export const recordContributionSchema = z.object({
  participantId: z.number().int().positive("Participant ID must be a positive integer"),
  amount: z.number().positive("Amount must be positive"),
  isLate: z.boolean().optional().default(false),
});
