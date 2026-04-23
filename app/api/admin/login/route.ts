import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/hash'
import { getDB } from '@/lib/db'
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth'
import { logEvent } from '@/lib/audit'

export const runtime = 'edge'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { email, password } = body as { email?: string; password?: string }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const ip =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0] ??
      'unknown'
    const userAgent = request.headers.get('user-agent') ?? undefined

    const db = getDB()
    const admin = await db
      .prepare('SELECT * FROM admin WHERE email = ?')
      .bind(email.toLowerCase().trim())
      .first<{ id: string; email: string; password_hash: string }>()

    if (!admin) {
      await logEvent(db, 'admin_login_failed', {
        ipAddress: ip,
        userAgent,
        details: { email },
      })
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const passwordValid = await verifyPassword(password, admin.password_hash)
    if (!passwordValid) {
      await logEvent(db, 'admin_login_failed', {
        ipAddress: ip,
        userAgent,
        details: { email },
      })
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await createSession({
      adminId: admin.id,
      email: admin.email,
      isAdmin: true,
    })

    await logEvent(db, 'admin_login', {
      ipAddress: ip,
      userAgent,
      details: { email: admin.email },
    })

    const response = NextResponse.json({ success: true })
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('admin login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
