/**
 * Application configuration — all magic numbers come from here.
 * @returns config object derived from environment variables with defaults.
 */
export function getConfig() {
  return {
    port: parseInt(process.env.PORT ?? '3000', 10),
    dbPath: process.env.DB_PATH ?? ':memory:',
    jwtSecret: process.env.JWT_SECRET ?? (() => { throw new Error('JWT_SECRET env var is required'); })(),
    maxParticipants: parseInt(process.env.MAX_PARTICIPANTS ?? '20', 10),
    latePenaltyRate: parseFloat(process.env.LATE_PENALTY_RATE ?? '0.05'),
  };
}

export type Config = ReturnType<typeof getConfig>;
