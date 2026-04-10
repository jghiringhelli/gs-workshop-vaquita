import type Database from "better-sqlite3";

export interface AuditLogEntry {
  readonly actorUserId: number | null;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: number | null;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface AuditLogger {
  record(entry: AuditLogEntry): void;
}

export class SqliteAuditLogger implements AuditLogger {
  public constructor(private readonly database: Database.Database) {}

  /**
   * Persists an audit log entry.
   * @param entry Audit event data.
   * @returns Nothing.
   */
  public record(entry: AuditLogEntry): void {
    this.database.prepare(
      `INSERT INTO audit_logs (
        actor_user_id,
        action,
        resource_type,
        resource_id,
        details
      ) VALUES (?, ?, ?, ?, ?)`,
    ).run(
      entry.actorUserId,
      entry.action,
      entry.resourceType,
      entry.resourceId,
      JSON.stringify(entry.details ?? {}),
    );
  }
}