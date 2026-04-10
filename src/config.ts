/** Central configuration — all magic numbers live here, sourced from env where appropriate. */
export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  /** Minimum participants required to start a tanda. */
  minParticipants: 3,
  /** Maximum participants allowed in a tanda. */
  maxParticipants: parseInt(process.env.MAX_PARTICIPANTS ?? '20', 10),
  /** Late contribution penalty as a decimal fraction (0.05 = 5%). */
  latePenaltyRate: parseFloat(process.env.LATE_PENALTY_RATE ?? '0.05'),
  dbPath: process.env.DB_PATH ?? 'tanda.db',
} as const;
