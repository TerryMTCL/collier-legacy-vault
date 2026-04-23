import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export const runtime = 'edge'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))
    const offset = (page - 1) * limit
    const eventType = searchParams.get('eventType')
    const personId = searchParams.get('personId')

    const db = getDB()

    let query = `
      SELECT al.*, p.name as person_name
      FROM audit_log al
      LEFT JOIN people p ON al.person_id = p.id
    `
    const conditions: string[] = []
    const bindings: unknown[] = []

    if (eventType) {
      conditions.push('al.event_type = ?')
      bindings.push(eventType)
    }

    if (personId) {
      conditions.push('al.person_id = ?')
      bindings.push(personId)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?'
    bindings.push(limit, offset)

    const logs = await db
      .prepare(query)
      .bind(...bindings)
      .all<{
        id: string
        event_type: string
        person_id: string | null
        ip_address: string | null
        user_agent: string | null
        details: string | null
        created_at: string
        person_name: string | null
      }>()

    // Count total
    let countQuery = 'SELECT COUNT(*) as count FROM audit_log al'
    const countBindings: unknown[] = []

    if (conditions.length > 0) {
      const countConditions: string[] = []
      if (eventType) {
        countConditions.push('al.event_type = ?')
        countBindings.push(eventType)
      }
      if (personId) {
        countConditions.push('al.person_id = ?')
        countBindings.push(personId)
      }
      countQuery += ' WHERE ' + countConditions.join(' AND ')
    }

    const total = await db
      .prepare(countQuery)
      .bind(...countBindings)
      .first<{ count: number }>()

    const totalCount = total?.count ?? 0
    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      logs: logs.results,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('admin audit GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
