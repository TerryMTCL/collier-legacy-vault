import { NextRequest, NextResponse } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'

export const config = {
  matcher: ['/admin/:path*'],
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // Allow the admin login page itself
  if (pathname === '/admin' || pathname === '/admin/') {
    return NextResponse.next()
  }

  // Check for session cookie
  const token = request.cookies.get(SESSION_COOKIE)?.value

  if (!token) {
    const loginUrl = new URL('/admin', request.url)
    return NextResponse.redirect(loginUrl)
  }

  const session = await verifySession(token)

  if (!session || !session.isAdmin) {
    const loginUrl = new URL('/admin', request.url)
    const response = NextResponse.redirect(loginUrl)
    // Clear invalid cookie
    response.cookies.delete(SESSION_COOKIE)
    return response
  }

  return NextResponse.next()
}
