export const config = {
  port: Number(process.env.PORT) || 3000,
  maxParticipants: Number(process.env.MAX_PARTICIPANTS) || 20,
  latePenaltyRate: Number(process.env.LATE_PENALTY_RATE) || 0.05,
  consecutiveMissesThreshold: Number(process.env.CONSECUTIVE_MISSES_THRESHOLD) || 2,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-prod',
};
