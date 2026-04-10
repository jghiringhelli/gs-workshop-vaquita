export const config = {
  maxParticipants: Number(process.env.MAX_PARTICIPANTS ?? 20),
  minParticipants: 3,
  latePenaltyPercent: Number(process.env.LATE_PENALTY_PERCENT ?? 5),
  consecutiveMissesForDefault: 2,
  get jwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is required');
    return secret;
  },
  port: Number(process.env.PORT ?? 3000),
};
