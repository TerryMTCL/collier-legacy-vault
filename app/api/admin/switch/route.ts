import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export const runtime = 'edge'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const db = getDB()

    const events = await db
      .prepare(
        `SELECT se.*, p.name as person_name, p.email as person_email
         FROM switch_events se
         LEFT JOIN people p ON se.person_id = p.id
         ORDER BY se.triggered_at DESC
         LIMIT 100`
      )
      .all<{
        id: string
        person_id: string
        triggered_at: string
        expires_at: string
        status: string
        cancel_token: string | null
        ip_address: string | null
        user_agent: string | null
        resolved_at: string | null
        person_name: string | null
        person_email: string | null
      }>()

    const pendingCount = await db
      .prepare("SELECT COUNT(*) as count FROM switch_events WHERE status = 'pending'")
      .first<{ count: number }>()

    return NextResponse.json({
      events: events.results,
      pendingCount: pendingCount?.count ?? 0,
    })
  } catch (error) {
    console.error('admin switch GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
