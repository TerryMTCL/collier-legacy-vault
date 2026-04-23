import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requirePerson } from '@/lib/auth'

export const runtime = 'edge'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requirePerson(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const db = getDB()

    const person = await db
      .prepare(
        'SELECT id, name, email, access_tier, is_activated, video_url FROM people WHERE id = ?'
      )
      .bind(authResult.personId)
      .first<{
        id: string
        name: string
        email: string
        access_tier: 'FULL' | 'PERSONAL'
        is_activated: number
        video_url: string | null
      }>()

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    // Get accessible vault categories based on tier
    const categoriesQuery =
      authResult.accessTier === 'FULL'
        ? 'SELECT id, name, icon, sort_order, access_tier FROM vault_categories ORDER BY sort_order ASC'
        : "SELECT id, name, icon, sort_order, access_tier FROM vault_categories WHERE access_tier = 'PERSONAL' ORDER BY sort_order ASC"

    const categories = await db
      .prepare(categoriesQuery)
      .all<{
        id: string
        name: string
        icon: string | null
        sort_order: number
        access_tier: string
      }>()

    return NextResponse.json({
      person: {
        id: person.id,
        name: person.name,
        email: person.email,
        access_tier: person.access_tier,
        is_activated: person.is_activated,
        hasVideo: Boolean(person.video_url),
      },
      categories: categories.results,
    })
  } catch (error) {
    console.error('vault/me error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
