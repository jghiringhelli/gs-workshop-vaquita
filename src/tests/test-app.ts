import jwt from "jsonwebtoken";
import { createApp } from "../app";

const TEST_JWT_SECRET = "test-secret-value-12345";

/**
 * Builds an isolated app instance backed by in-memory SQLite.
 * @returns Test app and helpers.
 */
export function createTestApp() {
  process.env.PORT = "3000";
  process.env.DATABASE_FILE = ":memory:";
  process.env.MAX_PARTICIPANTS = "20";
  process.env.LATE_PENALTY_PERCENT = "5";
  process.env.ROUND_WINDOW_DAYS = "7";
  process.env.JWT_SECRET = TEST_JWT_SECRET;

  return {
    app: createApp(),
    createToken(userId: number): string {
      return jwt.sign({}, TEST_JWT_SECRET, { subject: String(userId) });
    },
  };
}
