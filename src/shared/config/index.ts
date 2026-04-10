/** Maximum number of participants allowed per tanda. */
export const MAX_PARTICIPANTS = 20;

/** Late-payment penalty rate applied to missed-round contributions. */
export const PENALTY_PCT = 0.05;

/** JWT signing secret — must be set via environment variable in production. */
export const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret-change-me';
