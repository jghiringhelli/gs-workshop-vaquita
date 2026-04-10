import type { AppConfig } from "../config/env";

export interface AppContext {
  config: AppConfig;
  db: import("better-sqlite3").Database;
}
