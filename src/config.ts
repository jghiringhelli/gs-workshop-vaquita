import dotenv from "dotenv";
import { z } from "zod";

// Load .env file
dotenv.config();

// Validation schema for environment variables
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(10, "JWT_SECRET must be at least 10 characters"),
  PORT: z.coerce.number().default(3000),
});

type Environment = z.infer<typeof envSchema>;

// Parse and validate environment variables
const parsed = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: process.env.PORT,
});

// Determine database URL based on environment
const databaseUrl = parsed.DATABASE_URL || 
  (parsed.NODE_ENV === "test" ? "file:./test.db" : "file:./dev.db");

const env = {
  ...parsed,
  DATABASE_URL: databaseUrl,
};

// Business rule configuration (magic numbers — all in one place)
export const config = {
  env: env.NODE_ENV as "development" | "test" | "production",
  database: {
    url: env.DATABASE_URL,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: "7d",
  },
  server: {
    port: env.PORT,
  },
  tanda: {
    minParticipants: 3,
    maxParticipants: 20,
    lateFeePercent: 0.05, // 5% penalty
    missedContributionThreshold: 2, // 2 consecutive misses = defaulter
    roundDurationDays: 7,
  },
};

export default config;
