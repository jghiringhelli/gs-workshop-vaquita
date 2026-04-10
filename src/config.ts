export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
  nodeEnv: process.env.NODE_ENV ?? "development",

  // Tanda business rules — configurable via env
  maxParticipants: parseInt(process.env.MAX_PARTICIPANTS ?? "20", 10),
  minParticipants: parseInt(process.env.MIN_PARTICIPANTS ?? "3", 10),
  latePenaltyRate: parseFloat(process.env.LATE_PENALTY_RATE ?? "0.05"),
  maxConsecutiveMissed: parseInt(process.env.MAX_CONSECUTIVE_MISSED ?? "2", 10),

  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
} as const;
