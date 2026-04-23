import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logEvent } from '@/lib/audit'

export const runtime = 'edge'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id } = await params
    const db = getDB()

    const category = await db
      .prepare('SELECT * FROM vault_categories WHERE id = ?')
      .bind(id)
      .first<{ id: string; name: string; access_tier: string }>()

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const body = await request.json()
    const { access_tier } = body as { access_tier?: string }

    if (!access_tier || !['FULL', 'PERSONAL'].includes(access_tier)) {
      return NextResponse.json({ error: 'access_tier must be FULL or PERSONAL' }, { status: 400 })
    }

    await db
      .prepare('UPDATE vault_categories SET access_tier = ? WHERE id = ?')
      .bind(access_tier, id)
      .run()

    const ip =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0] ??
      'unknown'

    await logEvent(db, 'vault_category_updated', {
      ipAddress: ip,
      details: { id, name: category.name, access_tier },
    })

    const updated = await db.prepare('SELECT * FROM vault_categories WHERE id = ?').bind(id).first()
    return NextResponse.json({ category: updated })
  } catch (error) {
    console.error('vault category PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
