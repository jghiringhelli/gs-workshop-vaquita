import { z } from "zod";

const EnvironmentSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_FILE: z.string().min(1).default("./data/tanda.db"),
  MAX_PARTICIPANTS: z.coerce.number().int().min(3).max(200).default(20),
  LATE_PENALTY_PERCENT: z.coerce.number().int().min(0).max(100).default(5),
  ROUND_WINDOW_DAYS: z.coerce.number().int().min(1).max(60).default(7),
  JWT_SECRET: z.string().min(10),
});

export type EnvironmentConfig = z.infer<typeof EnvironmentSchema>;

/**
 * Validates and returns application configuration from environment variables.
 * @returns Parsed and validated configuration.
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  return EnvironmentSchema.parse(process.env);
}
