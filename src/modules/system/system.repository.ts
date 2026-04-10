import { db, getDatabasePath } from "../../db/database";

type DatabasePingRow = {
  ready: number;
};

export class SystemRepository {
  public getDatabaseStatus(): { ready: boolean; path: string } {
    const row = db.prepare("SELECT 1 AS ready").get() as DatabasePingRow;

    return {
      ready: row.ready === 1,
      path: getDatabasePath(),
    };
  }
}