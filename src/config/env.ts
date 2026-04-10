import { z } from "zod";

import { ConfigurationError } from "../errors/app-error";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_PATH: z.string().min(1).default("data/tanda.db"),
  MAX_PARTICIPANTS: z.coerce.number().int().min(3).default(20),
  LATE_PENALTY_RATE: z.coerce.number().min(0).max(1).default(0.05),
  ROUND_WINDOW_HOURS: z.coerce.number().int().positive().default(168),
  JWT_SECRET: z.string().min(1).optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new ConfigurationError("Invalid environment configuration.", parsedEnv.error.flatten());
}

export const env = parsedEnv.data;

export const businessConfig = {
  maxParticipants: env.MAX_PARTICIPANTS,
  latePenaltyRate: env.LATE_PENALTY_RATE,
  roundWindowHours: env.ROUND_WINDOW_HOURS,
} as const;

export function requireJwtSecret(): string {
  if (!env.JWT_SECRET) {
    throw new ConfigurationError("JWT_SECRET must be set before enabling auth features.");
  }

  return env.JWT_SECRET;
}