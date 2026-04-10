/** Centralised runtime config — all magic numbers live here, never inline. */
export const config = {
  port: Number(process.env.PORT) || 3000,
  /** Required — throws on missing so the server fails fast at startup. */
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-in-prod',
  maxParticipants: Number(process.env.MAX_PARTICIPANTS) || 20,
  latePenaltyPct: Number(process.env.LATE_PENALTY_PCT) || 0.05,
} as const;
