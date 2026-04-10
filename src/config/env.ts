import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  /** Path to the SQLite database file. Use ':memory:' for in-memory (tests). */
  DATABASE_PATH: z.string().default('./data.db'),
  /** Required: JWT signing secret. Must be at least 32 characters. */
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  /** Maximum number of participants per tanda. */
  MAX_PARTICIPANTS: z.coerce.number().int().positive().default(20),
  /** Minimum participants needed to start a tanda. */
  MIN_PARTICIPANTS_TO_START: z.coerce.number().int().positive().default(3),
  /** Late contribution penalty as a decimal fraction (e.g., 0.05 = 5%). */
  PENALTY_PERCENT: z.coerce.number().positive().max(1).default(0.05),
  /** Hours after roundStartedAt within which contributions are considered on-time. */
  ROUND_WINDOW_HOURS: z.coerce.number().positive().default(72),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env: Env = parsed.data;
