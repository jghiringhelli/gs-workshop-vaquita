export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  maxParticipants: parseInt(process.env.MAX_PARTICIPANTS ?? "20", 10),
  penaltyPct: parseFloat(process.env.PENALTY_PCT ?? "0.05"),
  dbPath: process.env.DB_PATH ?? "tanda.db",
} as const;
