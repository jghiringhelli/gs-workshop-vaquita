export const env = {
  port: Number(process.env.PORT ?? 3000),
  maxParticipants: Number(process.env.MAX_PARTICIPANTS ?? 20),
  minParticipantsToStart: Number(process.env.MIN_PARTICIPANTS_TO_START ?? 3),
  penaltyPercent: Number(process.env.PENALTY_PERCENT ?? 0.05),
  contributionWindowDays: Number(process.env.CONTRIBUTION_WINDOW_DAYS ?? 7),
};
