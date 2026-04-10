import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_PATH: z.string().default('./tanda.db'),
  MAX_PARTICIPANTS: z.coerce.number().int().positive().default(20),
  LATE_PENALTY_RATE: z.coerce.number().positive().default(0.05),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(parsed.error.format());
  process.exit(1);
}

/**
 * Application configuration derived from environment variables.
 * All values are validated at startup — missing required vars cause immediate exit.
 */
export const config = {
  port: parsed.data.PORT,
  nodeEnv: parsed.data.NODE_ENV,
  databasePath: parsed.data.DATABASE_PATH,
  /** Maximum number of participants allowed per tanda (BR-2). */
  maxParticipants: parsed.data.MAX_PARTICIPANTS,
  /** Late contribution penalty as a decimal fraction, e.g. 0.05 = 5% (BR-6). */
  latePenaltyRate: parsed.data.LATE_PENALTY_RATE,
} as const;
