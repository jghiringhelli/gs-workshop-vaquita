export interface Config {
  PORT: number;
  JWT_SECRET: string;
  DATABASE_URL: string;
  MAX_PARTICIPANTS: number;
  MIN_PARTICIPANTS: number;
  LATE_PENALTY_PERCENT: number;
  NODE_ENV: string;
}

export const config: Config = {
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  DATABASE_URL: process.env.DATABASE_URL ?? 'file:./dev.db',
  MAX_PARTICIPANTS: parseInt(process.env.MAX_PARTICIPANTS ?? '20', 10),
  MIN_PARTICIPANTS: parseInt(process.env.MIN_PARTICIPANTS ?? '3', 10),
  LATE_PENALTY_PERCENT: parseInt(process.env.LATE_PENALTY_PERCENT ?? '5', 10),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
};
