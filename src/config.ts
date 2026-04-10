export const config = {
  port: Number(process.env.PORT ?? 3000),
  maxParticipants: Number(process.env.MAX_PARTICIPANTS ?? 20),
  minParticipants: Number(process.env.MIN_PARTICIPANTS ?? 3),
  latePenaltyRate: Number(process.env.LATE_PENALTY_RATE ?? 0.05),
  maxConsecutiveMisses: Number(process.env.MAX_CONSECUTIVE_MISSES ?? 2),
};
