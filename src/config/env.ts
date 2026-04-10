import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(0).default(3000),
  DATABASE_URL: z.string().min(1).default("file:./dev.db"),
  JWT_SECRET: z.string().trim().min(1).default("change-me-to-a-long-random-string"),
  MAX_PARTICIPANTS: z.coerce.number().int().min(3).default(20),
  LATE_PENALTY_PERCENT: z.coerce.number().min(0).max(100).default(5),
});

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  maxParticipants: number;
  latePenaltyPercent: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    jwtSecret: parsed.JWT_SECRET,
    maxParticipants: parsed.MAX_PARTICIPANTS,
    latePenaltyPercent: parsed.LATE_PENALTY_PERCENT,
  };
}
