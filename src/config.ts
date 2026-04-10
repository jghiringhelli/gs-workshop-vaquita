export const config = {
  // Tanda constraints
  MIN_PARTICIPANTS: 3,
  MAX_PARTICIPANTS: parseInt(process.env.MAX_PARTICIPANTS || '20', 10),
  
  // Financial
  PENALTY_PERCENTAGE: parseFloat(process.env.PENALTY_PERCENTAGE || '5'),
  
  // Auth
  JWT_SECRET: process.env.JWT_SECRET,
  
  // Server
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  DB_PATH: process.env.DB_PATH,
};

export function validateConfig(): void {
  if (!config.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  if (config.MIN_PARTICIPANTS < 2) {
    throw new Error('MIN_PARTICIPANTS must be at least 2');
  }
  if (config.MAX_PARTICIPANTS < config.MIN_PARTICIPANTS) {
    throw new Error('MAX_PARTICIPANTS must be >= MIN_PARTICIPANTS');
  }
  if (config.PENALTY_PERCENTAGE < 0 || config.PENALTY_PERCENTAGE > 100) {
    throw new Error('PENALTY_PERCENTAGE must be between 0 and 100');
  }
}
