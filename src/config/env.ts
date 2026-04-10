import fs from "node:fs";
import path from "node:path";

import { z } from "zod";

import { ConfigError } from "../errors/app-error";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1).default("file:./dev.db"),
  JWT_SECRET: z.string().min(1).optional(),
  JWT_EXPIRES_IN_HOURS: z.coerce.number().int().min(1).default(12),
  MAX_PARTICIPANTS: z.coerce.number().int().min(3).default(20),
  LATE_PENALTY_PERCENT: z.coerce.number().min(0).max(100).default(5),
  CONTRIBUTION_WINDOW_DAYS: z.coerce.number().int().min(1).default(7),
});

type ParsedEnv = z.infer<typeof envSchema>;

export interface AppConfig {
  nodeEnv: ParsedEnv["NODE_ENV"];
  port: number;
  databaseUrl: string;
  jwtSecret?: string;
  auth: {
    jwtExpiresInHours: number;
  };
  limits: {
    maxParticipants: number;
    contributionWindowDays: number;
  };
  penalties: {
    lateContributionPercent: number;
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (env === process.env) {
    loadProjectEnvFile();
  }

  const result = envSchema.safeParse(env);

  if (!result.success) {
    throw new ConfigError("Invalid environment configuration", result.error.flatten());
  }

  return {
    nodeEnv: result.data.NODE_ENV,
    port: result.data.PORT,
    databaseUrl: result.data.DATABASE_URL,
    jwtSecret: result.data.JWT_SECRET,
    auth: {
      jwtExpiresInHours: result.data.JWT_EXPIRES_IN_HOURS,
    },
    limits: {
      maxParticipants: result.data.MAX_PARTICIPANTS,
      contributionWindowDays: result.data.CONTRIBUTION_WINDOW_DAYS,
    },
    penalties: {
      lateContributionPercent: result.data.LATE_PENALTY_PERCENT,
    },
  };
}

export function requireJwtSecret(config: AppConfig): string {
  if (!config.jwtSecret) {
    throw new ConfigError("JWT_SECRET must be configured before using authentication features");
  }

  return config.jwtSecret;
}

function loadProjectEnvFile(): void {
  const envPath = path.resolve(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");

  for (const line of content.split(/\r?\n/u)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = stripWrappingQuotes(rawValue);

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
