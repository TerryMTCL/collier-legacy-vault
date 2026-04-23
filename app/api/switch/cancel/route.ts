import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { logEvent } from '@/lib/audit'

export const runtime = 'edge'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return new NextResponse(
        renderPage('Missing Token', 'No cancel token was provided. This link may be invalid.', false),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    const db = getDB()

    const event = await db
      .prepare(
        `SELECT se.*, p.name as person_name
         FROM switch_events se
         LEFT JOIN people p ON se.person_id = p.id
         WHERE se.cancel_token = ?`
      )
      .first<{
        id: string
        person_id: string
        status: string
        expires_at: string
        person_name: string | null
      }>()

    if (!event) {
      return new NextResponse(
        renderPage('Invalid Token', 'This cancel link is invalid or has already been used.', false),
        { status: 404, headers: { 'Content-Type': 'text/html' } }
      )
    }

    if (event.status !== 'pending') {
      return new NextResponse(
        renderPage(
          'Already Resolved',
          `This switch event has already been ${event.status}. No action needed.`,
          true
        ),
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Check if expired
    const now = new Date()
    const expiresAt = new Date(event.expires_at)
    if (now > expiresAt) {
      return new NextResponse(
        renderPage('Switch Expired', 'This switch event has already expired and cannot be cancelled.', false),
        { status: 410, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Cancel the event
    await db
      .prepare(
        `UPDATE switch_events SET
          status = 'cancelled',
          resolved_at = datetime('now')
        WHERE cancel_token = ?`
      )
      .bind(token)
      .run()

    const ip =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0] ??
      'unknown'

    await logEvent(db, 'switch_cancelled', {
      personId: event.person_id,
      ipAddress: ip,
      details: { switch_event_id: event.id, person_name: event.person_name },
    })

    return new NextResponse(
      renderPage(
        'Switch Cancelled',
        `The dead man's switch triggered by ${event.person_name ?? 'unknown'} has been successfully cancelled. No vault access will be granted.`,
        true
      ),
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    )
  } catch (error) {
    console.error('switch cancel error:', error)
    return new NextResponse(
      renderPage('Error', 'An error occurred while processing your request. Please try again.', false),
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    )
  }
}

function renderPage(title: string, message: string, success: boolean): string {
  const color = success ? '#22c55e' : '#ef4444'
  const icon = success ? '✓' : '✗'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Collier Legacy Vault</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #030712;
      color: #f9fafb;
      font-family: system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      padding: 48px 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    .icon {
      font-size: 48px;
      color: ${color};
      margin-bottom: 16px;
    }
    h1 { font-size: 24px; margin-bottom: 12px; }
    p { color: #9ca3af; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`
}
