export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  jwtSecret: process.env.JWT_SECRET ?? 'change-me-to-a-long-random-string',
  maxParticipants: parseInt(process.env.MAX_PARTICIPANTS ?? '20', 10),
  minParticipants: 3,
  latePenaltyPct: parseFloat(process.env.LATE_PENALTY_PCT ?? '0.05'),
  maxConsecutiveMissed: parseInt(process.env.MAX_CONSECUTIVE_MISSED ?? '2', 10),
};
