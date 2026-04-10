export const config = {
  DATABASE_PATH: process.env.DATABASE_PATH || ':memory:',
  PORT: parseInt(process.env.PORT || '3000'),
  MAX_PARTICIPANTS: parseInt(process.env.MAX_PARTICIPANTS || '20'),
  LATE_PENALTY_PERCENT: parseFloat(process.env.LATE_PENALTY_PERCENT || '5'),
};
