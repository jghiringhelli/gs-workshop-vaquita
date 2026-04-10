import { getDb } from "../db/database";

export interface HealthStatus {
  status: "ok";
  timestamp: string;
  db: "ok" | "error";
}

/**
 * Repository for health-check queries — the only place that touches DB for health.
 */
export class HealthRepository {
  /**
   * Pings the database with a trivial query.
   * @returns true if DB responds
   */
  ping(): boolean {
    try {
      getDb().prepare("SELECT 1").get();
      return true;
    } catch {
      return false;
    }
  }
}
