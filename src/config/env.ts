export interface AppConfig {
  port: number;
  jwtSecret: string;
  maxParticipants: number;
  latePenaltyPercent: number;
}

const DEFAULT_PORT = 3000;
const DEFAULT_MAX_PARTICIPANTS = 20;
const DEFAULT_LATE_PENALTY_PERCENT = 5;

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

export function getConfig(): AppConfig {
  return {
    port: parseNumber(process.env.PORT, DEFAULT_PORT),
    jwtSecret: process.env.JWT_SECRET ?? "",
    maxParticipants: parseNumber(
      process.env.MAX_PARTICIPANTS,
      DEFAULT_MAX_PARTICIPANTS
    ),
    latePenaltyPercent: parseNumber(
      process.env.LATE_PENALTY_PERCENT,
      DEFAULT_LATE_PENALTY_PERCENT
    ),
  };
}
