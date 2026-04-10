function envNumber(key: string, def: number): number {
  const v = process.env[key];
  if (v === undefined || v === '') return def;
  const n = parseFloat(v);
  return isNaN(n) ? def : n;
}

export const config = {
  get port() {
    return envNumber('PORT', 3000);
  },

  /** Throws at access-time if JWT_SECRET is not set — triggers startup failure. */
  get jwtSecret(): string {
    const s = process.env.JWT_SECRET;
    if (!s) {
      throw new Error(
        'Missing required environment variable: JWT_SECRET. ' +
          'Set it in your .env file before starting the server.',
      );
    }
    return s;
  },

  get dbPath(): string {
    const url = process.env.DATABASE_URL ?? 'file:./dev.db';
    return url.replace(/^file:/, '');
  },

  get maxParticipants() {
    return envNumber('MAX_PARTICIPANTS', 20);
  },
  get minParticipants() {
    return envNumber('MIN_PARTICIPANTS', 3);
  },
  get contributionWindowDays() {
    return envNumber('CONTRIBUTION_WINDOW_DAYS', 7);
  },
  get lateWindowDays() {
    return envNumber('LATE_WINDOW_DAYS', 14);
  },
  get penaltyRate() {
    return envNumber('PENALTY_RATE', 0.05);
  },
};
