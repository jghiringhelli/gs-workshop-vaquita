import type { AppConfig } from "../config/env";
import type { HealthRepository, HealthStatus } from "../repositories/health-repository";

/**
 * Service for health-check operations.
 */
export class HealthService {
  constructor(
    private readonly healthRepository: HealthRepository,
    private readonly config: AppConfig,
  ) {}

  /**
   * Returns current health status including port and DB connectivity.
   * @returns {HealthStatus}
   */
  getHealth(): HealthStatus & { port: number } {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      db: this.healthRepository.ping() ? "ok" : "error",
      port: this.config.port,
    };
  }
}
