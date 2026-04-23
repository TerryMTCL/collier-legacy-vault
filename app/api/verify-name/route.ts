import { NextRequest, NextResponse } from 'next/server'
import { getDB, queryPersonByName } from '@/lib/db'
import { logEvent } from '@/lib/audit'

export const runtime = 'edge'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { name } = body as { name?: string }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const db = getDB()
    const person = await queryPersonByName(db, name.trim())

    const ip = request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0] ??
      'unknown'
    const userAgent = request.headers.get('user-agent') ?? undefined

    if (!person) {
      await logEvent(db, 'verify_name_not_found', {
        ipAddress: ip,
        userAgent,
        details: { name: name.trim() },
      })
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    await logEvent(db, 'verify_name_found', {
      personId: person.id,
      ipAddress: ip,
      userAgent,
    })

    return NextResponse.json({ personId: person.id })
  } catch (error) {
    console.error('verify-name error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
