import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getDB, queryVaultCategories } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logEvent } from '@/lib/audit'

export const runtime = 'edge'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const db = getDB()
    const categories = await queryVaultCategories(db)
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('vault categories GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json()
    const { name, icon, sort_order = 0, access_tier = 'PERSONAL' } = body as {
      name?: string
      icon?: string
      sort_order?: number
      access_tier?: string
    }

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!['FULL', 'PERSONAL'].includes(access_tier)) {
      return NextResponse.json({ error: 'access_tier must be FULL or PERSONAL' }, { status: 400 })
    }

    const db = getDB()
    const id = uuidv4()

    await db
      .prepare(
        `INSERT INTO vault_categories (id, name, icon, sort_order, access_tier)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id, name.trim(), icon ?? null, sort_order, access_tier)
      .run()

    const ip =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0] ??
      'unknown'

    await logEvent(db, 'vault_category_created', {
      ipAddress: ip,
      details: { name, access_tier },
    })

    const category = await db.prepare('SELECT * FROM vault_categories WHERE id = ?').bind(id).first()
    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('vault categories POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
