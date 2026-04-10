export const config = {
  MAX_PARTICIPANTS: Number(process.env.MAX_PARTICIPANTS ?? 20),
  MIN_PARTICIPANTS: 3,
  LATE_PENALTY_PERCENT: Number(process.env.LATE_PENALTY_PERCENT ?? 5),
  PORT: Number(process.env.PORT ?? 3000),
} as const;
