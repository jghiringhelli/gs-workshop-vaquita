import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "file:./dev.db",
  jwtSecret: process.env.JWT_SECRET || "",

  // Business rules — named constants from environment config
  maxParticipants: parseInt(process.env.MAX_PARTICIPANTS || "20", 10),
  latePenaltyPct: parseInt(process.env.LATE_PENALTY_PCT || "5", 10),
  minParticipantsToStart: parseInt(process.env.MIN_PARTICIPANTS_TO_START || "3", 10),
  consecutiveMissesForDefault: parseInt(process.env.CONSECUTIVE_MISSES_FOR_DEFAULT || "2", 10),
} as const;

// Fail fast if JWT_SECRET is not set (except in test mode)
if (!config.jwtSecret && config.nodeEnv !== "test") {
  throw new Error("JWT_SECRET environment variable is required");
}

