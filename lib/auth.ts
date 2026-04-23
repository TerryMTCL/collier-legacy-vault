import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'clv_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

export interface SessionPayload {
  adminId: string
  email: string
  isAdmin: true
  iat?: number
  exp?: number
}

export async function createSession(payload: Omit<SessionPayload, 'iat' | 'exp'>): Promise<string> {
  const secret = getJWTSecret()
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
  return token
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getJWTSecret()
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySession(token)
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function requireAdmin(request: NextRequest): Promise<SessionPayload | NextResponse> {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const session = await verifySession(token)
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return session
}

export { SESSION_COOKIE, SESSION_MAX_AGE }
