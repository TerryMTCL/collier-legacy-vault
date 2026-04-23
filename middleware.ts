import { NextRequest, NextResponse } from 'next/server'

export const config = {
  matcher: ['/admin/:path*'],
}

const SESSION_COOKIE = 'clv_session'

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // Allow the admin login page itself
  if (pathname === '/admin' || pathname === '/admin/') {
    return NextResponse.next()
  }

  // Just check for cookie existence - API routes handle full verification
  const token = request.cookies.get(SESSION_COOKIE)?.value

  if (!token) {
    const loginUrl = new URL('/admin', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}
