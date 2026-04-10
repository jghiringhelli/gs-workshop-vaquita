import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load .env before Zod validation so env vars are available at startup
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const raw = trimmed.slice(eqIdx + 1).trim();
    const value = raw.replace(/^["']|["']$/g, "");
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default("file:./dev.db"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;

/** Maximum number of participants allowed in a single tanda */
export const MAX_PARTICIPANTS = 20;

/** Minimum number of participants required to start a tanda */
export const MIN_PARTICIPANTS = 3;

/** Late contribution penalty as a decimal (5%) */
export const LATE_PENALTY_PCT = 0.05;

/** Number of consecutive missed contributions before flagging as defaulter */
export const MAX_CONSECUTIVE_MISSES = 2;
