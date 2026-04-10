export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  maxParticipants: parseInt(process.env.MAX_PARTICIPANTS || '20', 10),
  minParticipants: parseInt(process.env.MIN_PARTICIPANTS || '3', 10),
  latePenaltyPercent: parseFloat(process.env.LATE_PENALTY_PERCENT || '5'),
  maxConsecutiveMisses: parseInt(process.env.MAX_CONSECUTIVE_MISSES || '2', 10),
};
