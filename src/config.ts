/** Application configuration loaded from environment variables. */
export const config = {
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  dbPath: process.env['DB_PATH'] ?? ':memory:',
  jwtSecret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
  maxParticipants: parseInt(process.env['MAX_PARTICIPANTS'] ?? '20', 10),
  minParticipants: 3,
  latePenaltyPercent: parseFloat(process.env['LATE_PENALTY_PERCENT'] ?? '5'),
  missedContributionsLimit: 2,
} as const;
