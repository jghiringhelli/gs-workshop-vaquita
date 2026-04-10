import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

export const createTandaSchema = z.object({
  name: z.string().min(1).max(100),
  organizerId: z.number().int().positive(),
  contributionAmount: z.number().positive(),
});

export const joinTandaSchema = z.object({
  userId: z.number().int().positive(),
});

export const recordContributionSchema = z.object({
  participantId: z.number().int().positive(),
  amount: z.number().positive(),
  status: z.enum(["paid", "late"]).default("paid"),
});
