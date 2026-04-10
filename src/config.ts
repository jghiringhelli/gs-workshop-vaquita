export const MAX_PARTICIPANTS = parseInt(process.env.MAX_PARTICIPANTS ?? '20', 10);
export const MIN_PARTICIPANTS = 3;
export const LATE_PENALTY_PCT = parseFloat(process.env.LATE_PENALTY_PCT ?? '0.05');
export const PORT = parseInt(process.env.PORT ?? '3000', 10);
export const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me-in-production';
