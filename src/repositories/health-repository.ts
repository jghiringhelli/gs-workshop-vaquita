export interface HealthStatus {
  status: "ok";
  timestamp: string;
}

export class HealthRepository {
  getStatus(): HealthStatus {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
