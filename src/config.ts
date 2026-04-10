export const config = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  MIN_PARTICIPANTS: parseInt(process.env.MIN_PARTICIPANTS || '3', 10),
  MAX_PARTICIPANTS: parseInt(process.env.MAX_PARTICIPANTS || '20', 10),
  LATE_PENALTY_RATE: parseFloat(process.env.LATE_PENALTY_RATE || '0.05'),
};
