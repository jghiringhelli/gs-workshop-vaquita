import { businessConfig, env } from "../../config/env";
import { SystemRepository } from "./system.repository";

export class SystemService {
  public constructor(private readonly systemRepository: SystemRepository) {}

  public getHealth(): {
    status: "ok";
    environment: string;
    database: { ready: boolean; path: string };
    config: typeof businessConfig;
  } {
    return {
      status: "ok",
      environment: env.NODE_ENV,
      database: this.systemRepository.getDatabaseStatus(),
      config: businessConfig,
    };
  }
}

export const systemService = new SystemService(new SystemRepository());