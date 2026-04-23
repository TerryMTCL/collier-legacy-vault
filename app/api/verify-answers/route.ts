import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/hash'
import { getDB, queryChallengeQuestions, queryPersonById, queryFailedAttemptsForIP } from '@/lib/db'
import { logEvent } from '@/lib/audit'
import { sendSwitchTriggerEmail, sendToJoshTelegram, APP_URL } from './helpers'

export const runtime = 'edge'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { personId, answers } = body as { personId?: string; answers?: string[] }

    if (!personId || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'personId and answers are required' }, { status: 400 })
    }

    const ip =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0] ??
      'unknown'
    const userAgent = request.headers.get('user-agent') ?? undefined

    const db = getDB()

    // Check IP lockout: 3 failures in last hour
    const recentFailures = await queryFailedAttemptsForIP(db, ip)
    if (recentFailures >= 3) {
      await logEvent(db, 'verify_locked', {
        personId,
        ipAddress: ip,
        userAgent,
        details: { reason: 'too_many_failures' },
      })
      return NextResponse.json(
        { error: 'Too many failed attempts. Please try again in 1 hour.' },
        { status: 429 }
      )
    }

    const person = await queryPersonById(db, personId)
    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    const questions = await queryChallengeQuestions(db, personId)
    if (questions.length === 0) {
      return NextResponse.json({ error: 'No challenge questions configured' }, { status: 400 })
    }

    if (answers.length !== questions.length) {
      return NextResponse.json(
        { error: `Expected ${questions.length} answers, got ${answers.length}` },
        { status: 400 }
      )
    }

    // Verify all answers
    let allCorrect = true
    for (let i = 0; i < questions.length; i++) {
      const answer = answers[i]?.trim() ?? ''
      const hash = questions[i].answer_hash
      const correct = await verifyPassword(answer.toLowerCase(), hash)
      if (!correct) {
        allCorrect = false
        break
      }
    }

    if (!allCorrect) {
      await logEvent(db, 'verify_failed', {
        personId,
        ipAddress: ip,
        userAgent,
        details: { person_name: person.name },
      })
      const remainingAttempts = 2 - recentFailures
      return NextResponse.json(
        {
          error: 'One or more answers are incorrect.',
          remainingAttempts: Math.max(0, remainingAttempts),
        },
        { status: 400 }
      )
    }

    // All correct — create switch event
    const switchId = crypto.randomUUID()
    const cancelToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    await db
      .prepare(
        `INSERT INTO switch_events (id, person_id, expires_at, status, cancel_token, ip_address, user_agent)
         VALUES (?, ?, ?, 'pending', ?, ?, ?)`
      )
      .bind(switchId, personId, expiresAt, cancelToken, ip, userAgent ?? null)
      .run()

    await logEvent(db, 'verify_success', {
      personId,
      ipAddress: ip,
      userAgent,
      details: { switch_event_id: switchId },
    })

    await logEvent(db, 'switch_triggered', {
      personId,
      ipAddress: ip,
      userAgent,
      details: { switch_event_id: switchId, expires_at: expiresAt },
    })

    // Send notifications
    const cancelLink = `${APP_URL}/api/switch/cancel?token=${cancelToken}`
    try {
      await sendSwitchTriggerEmail(person.name, cancelLink)
    } catch (err) {
      console.error('Failed to send switch trigger email:', err)
    }

    try {
      await sendToJoshTelegram(
        `🚨 <b>Dead Man's Switch Triggered</b>\n\n` +
          `Person: ${person.name}\n` +
          `IP: ${ip}\n` +
          `Expires: ${expiresAt}\n\n` +
          `<a href="${cancelLink}">Cancel Switch</a>`
      )
    } catch (err) {
      console.error('Failed to send Telegram notification:', err)
    }

    return NextResponse.json({
      success: true,
      message: 'Verification submitted. You will receive an email within 24 hours.',
    })
  } catch (error) {
    console.error('verify-answers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
