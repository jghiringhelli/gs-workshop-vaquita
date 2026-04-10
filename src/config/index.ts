// Business rules configuration
export const config = {
  maxParticipants: parseInt(process.env.MAX_PARTICIPANTS || "20"),
  latePenaltyPercent: parseInt(process.env.LATE_PENALTY_PERCENT || "5"),
  consecutiveMissesThreshold: parseInt(process.env.CONSECUTIVE_MISSES_THRESHOLD || "2"),
  minParticipants: 3,
  jwtSecret: process.env.JWT_SECRET || "",
  port: parseInt(process.env.PORT || "3000"),
  nodeEnv: process.env.NODE_ENV || "development",
};

// Validation
if (!config.jwtSecret && config.nodeEnv !== "test") {
  throw new Error("JWT_SECRET environment variable is required");
}

export default config;
