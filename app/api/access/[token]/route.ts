import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { createPersonSession, PERSON_SESSION_COOKIE } from '@/lib/auth'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  try {
    const { token } = await params
    if (!token) {
      return NextResponse.redirect(new URL('/?error=invalid_token', request.url))
    }

    const db = getDB()

    // Find person by activation token (stored as password_hash after switch execution)
    const person = await db
      .prepare(
        'SELECT id, name, email, access_tier FROM people WHERE password_hash = ? AND is_activated = 1'
      )
      .bind(token)
      .first<{ id: string; name: string; email: string; access_tier: 'FULL' | 'PERSONAL' }>()

    if (!person) {
      return NextResponse.redirect(new URL('/?error=invalid_token', request.url))
    }

    // Create person session JWT
    const sessionToken = await createPersonSession({
      personId: person.id,
      name: person.name,
      accessTier: person.access_tier,
    })

    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    response.cookies.set(PERSON_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('access token error:', error)
    return NextResponse.redirect(new URL('/?error=server', request.url))
  }
}
