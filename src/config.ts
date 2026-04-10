export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  maxParticipants: parseInt(process.env.MAX_PARTICIPANTS ?? '20', 10),
  minParticipants: 3,
  latePenaltyRate: parseFloat(process.env.LATE_PENALTY ?? '0.05'),
  consecutiveMissesThreshold: 2,
  jwtSecret: process.env.JWT_SECRET ?? 'change-me-to-a-long-random-string',
};
