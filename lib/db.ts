import { getRequestContext } from '@cloudflare/next-on-pages'

export interface D1Database {
  prepare(query: string): D1PreparedStatement
  dump(): Promise<ArrayBuffer>
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>
  exec(query: string): Promise<D1ExecResult>
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(colName?: string): Promise<T | null>
  run<T = unknown>(): Promise<D1Result<T>>
  all<T = unknown>(): Promise<D1Result<T>>
  raw<T = unknown>(): Promise<T[]>
}

export interface D1Result<T = unknown> {
  results: T[]
  success: boolean
  error?: string
  meta: Record<string, unknown>
}

export interface D1ExecResult {
  count: number
  duration: number
}

export function getDB(): D1Database {
  const { env } = getRequestContext()
  return (env as unknown as { DB: D1Database }).DB
}

// Typed DB models
export interface Person {
  id: string
  name: string
  email: string
  access_tier: 'FULL' | 'PERSONAL'
  password_hash: string | null
  is_activated: number
  activated_at: string | null
  personal_email_message: string | null
  video_url: string | null
  created_at: string
  updated_at: string
}

export interface ChallengeQuestion {
  id: string
  person_id: string
  question_order: number
  question: string
  answer_hash: string
  created_at: string
}

export interface VaultCategory {
  id: string
  name: string
  icon: string | null
  sort_order: number
  access_tier: 'FULL' | 'PERSONAL'
  created_at: string
}

export interface VaultEntry {
  id: string
  category_id: string
  title: string
  entry_type: 'login' | 'document' | 'note' | 'file'
  encrypted_data: string
  file_keys: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SwitchEvent {
  id: string
  person_id: string
  triggered_at: string
  expires_at: string
  status: 'pending' | 'cancelled' | 'executed'
  cancel_token: string | null
  ip_address: string | null
  user_agent: string | null
  resolved_at: string | null
}

export interface AuditLog {
  id: string
  event_type: string
  person_id: string | null
  ip_address: string | null
  user_agent: string | null
  details: string | null
  created_at: string
}

export interface Admin {
  id: string
  email: string
  password_hash: string
  totp_secret: string | null
  created_at: string
}

export interface Session {
  id: string
  person_id: string | null
  is_admin: number
  token_hash: string
  expires_at: string
  created_at: string
}

// Query helpers
export async function queryPeople(db: D1Database): Promise<Person[]> {
  const result = await db.prepare('SELECT * FROM people ORDER BY created_at DESC').all<Person>()
  return result.results
}

export async function queryPersonById(db: D1Database, id: string): Promise<Person | null> {
  return db.prepare('SELECT * FROM people WHERE id = ?').bind(id).first<Person>()
}

export async function queryPersonByName(db: D1Database, name: string): Promise<Person | null> {
  return db.prepare('SELECT * FROM people WHERE LOWER(name) = LOWER(?)').bind(name).first<Person>()
}

export async function queryChallengeQuestions(db: D1Database, personId: string): Promise<ChallengeQuestion[]> {
  const result = await db
    .prepare('SELECT * FROM challenge_questions WHERE person_id = ? ORDER BY question_order ASC')
    .bind(personId)
    .all<ChallengeQuestion>()
  return result.results
}

export async function queryVaultCategories(db: D1Database): Promise<VaultCategory[]> {
  const result = await db.prepare('SELECT * FROM vault_categories ORDER BY sort_order ASC').all<VaultCategory>()
  return result.results
}

export async function queryVaultEntries(db: D1Database, categoryId?: string): Promise<VaultEntry[]> {
  if (categoryId) {
    const result = await db
      .prepare('SELECT * FROM vault_entries WHERE category_id = ? ORDER BY sort_order ASC')
      .bind(categoryId)
      .all<VaultEntry>()
    return result.results
  }
  const result = await db.prepare('SELECT * FROM vault_entries ORDER BY sort_order ASC').all<VaultEntry>()
  return result.results
}

export async function queryRecentAuditLog(db: D1Database, limit = 10): Promise<AuditLog[]> {
  const result = await db
    .prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?')
    .bind(limit)
    .all<AuditLog>()
  return result.results
}

export async function queryFailedAttemptsForIP(db: D1Database, ip: string): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const result = await db
    .prepare(
      "SELECT COUNT(*) as count FROM audit_log WHERE event_type = 'verify_failed' AND ip_address = ? AND created_at > ?"
    )
    .bind(ip, oneHourAgo)
    .first<{ count: number }>()
  return result?.count ?? 0
}
