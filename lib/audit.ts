import type { D1Database } from './db'

export type AuditEventType =
  | 'verify_name_found'
  | 'verify_name_not_found'
  | 'verify_success'
  | 'verify_failed'
  | 'verify_locked'
  | 'switch_triggered'
  | 'switch_cancelled'
  | 'switch_executed'
  | 'admin_login'
  | 'admin_login_failed'
  | 'admin_logout'
  | 'person_created'
  | 'person_updated'
  | 'person_deleted'
  | 'vault_entry_created'
  | 'vault_entry_updated'
  | 'vault_entry_deleted'
  | 'vault_category_created'
  | 'vault_category_updated'
  | 'vault_category_deleted'
  | 'access_granted'
  | 'cron_check'
  | 'video_uploaded'
  | 'video_deleted'
  | 'file_uploaded'
  | 'file_deleted'

export interface LogEventOptions {
  personId?: string
  ipAddress?: string
  userAgent?: string
  details?: Record<string, unknown> | string
}

export async function logEvent(
  db: D1Database,
  eventType: AuditEventType,
  options: LogEventOptions = {}
): Promise<void> {
  const id = crypto.randomUUID()
  const details =
    typeof options.details === 'string'
      ? options.details
      : options.details
        ? JSON.stringify(options.details)
        : null

  try {
    await db
      .prepare(
        `INSERT INTO audit_log (id, event_type, person_id, ip_address, user_agent, details)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        eventType,
        options.personId ?? null,
        options.ipAddress ?? null,
        options.userAgent ?? null,
        details
      )
      .run()
  } catch (error) {
    // Don't let audit log failures break the main flow
    console.error('Failed to log audit event:', error)
  }
}
