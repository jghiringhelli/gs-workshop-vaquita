import type { AppConfig } from "../config/env";
import {
  HealthRepository,
  type HealthStatus,
} from "../repositories/health-repository";

export interface HealthResponse extends HealthStatus {
  service: string;
  config: {
    maxParticipants: number;
    latePenaltyPercent: number;
  };
}

export class HealthService {
  constructor(
    private readonly repository: HealthRepository,
    private readonly config: AppConfig
  ) {}

  getHealth(): HealthResponse {
    const status = this.repository.getStatus();

    return {
      ...status,
      service: "tanda-api",
      config: {
        maxParticipants: this.config.maxParticipants,
        latePenaltyPercent: this.config.latePenaltyPercent,
      },
    };
  }
}
