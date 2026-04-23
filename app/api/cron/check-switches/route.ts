import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { logEvent } from '@/lib/audit'
import { sendAccessGrantedEmail, sendPersonalMessageEmail } from '@/lib/email'

export const runtime = 'edge'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify cron secret to prevent unauthorized execution
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const db = getDB()
    const now = new Date().toISOString()

    // Find all pending switch events that have expired
    const expiredEvents = await db
      .prepare(
        `SELECT se.*, p.name as person_name, p.email as person_email,
                p.access_tier, p.personal_email_message
         FROM switch_events se
         JOIN people p ON se.person_id = p.id
         WHERE se.status = 'pending' AND se.expires_at <= ?`
      )
      .bind(now)
      .all<{
        id: string
        person_id: string
        person_name: string
        person_email: string
        access_tier: string
        personal_email_message: string | null
      }>()

    const processed: string[] = []
    const errors: string[] = []

    for (const event of expiredEvents.results) {
      try {
        // Generate activation token (a simple UUID as access key)
        const activationToken = crypto.randomUUID()
        const activationLink = `${process.env.APP_URL ?? 'https://collierlegacyvault.com'}/access/${activationToken}`

        // Mark person as activated — triggerer ALWAYS gets FULL access
        await db
          .prepare(
            `UPDATE people SET
              is_activated = 1,
              activated_at = datetime('now'),
              access_tier = 'FULL',
              password_hash = ?,
              updated_at = datetime('now')
            WHERE id = ?`
          )
          .bind(activationToken, event.person_id)
          .run()

        // Mark switch event as executed
        await db
          .prepare(
            `UPDATE switch_events SET
              status = 'executed',
              resolved_at = datetime('now')
            WHERE id = ?`
          )
          .bind(event.id)
          .run()

        // Send email to triggering person — personal message if they have one
        if (event.personal_email_message) {
          await sendPersonalMessageEmail(event.person_email, event.personal_email_message, activationLink)
        } else {
          await sendAccessGrantedEmail(event.person_email, activationLink)
        }

        // Send personal messages to ALL other authorized people
        const otherPeople = await db
          .prepare(`SELECT id, email, personal_email_message FROM people WHERE id != ?`)
          .bind(event.person_id)
          .all<{ id: string; email: string; personal_email_message: string | null }>()

        for (const other of otherPeople.results) {
          try {
            const otherActivationToken = crypto.randomUUID()
            const otherActivationLink = `${process.env.APP_URL ?? 'https://jcollier-legacy.com'}/access/${otherActivationToken}`
            // Store their activation token temporarily
            await db
              .prepare(`UPDATE people SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`)
              .bind(otherActivationToken, other.id)
              .run()
            if (other.personal_email_message) {
              await sendPersonalMessageEmail(other.email, other.personal_email_message, otherActivationLink)
            } else {
              await sendAccessGrantedEmail(other.email, otherActivationLink)
            }
          } catch (emailErr) {
            console.error(`Failed to send email to person ${other.id}:`, emailErr)
          }
        }

        await logEvent(db, 'access_granted', {
          personId: event.person_id,
          details: {
            person_name: event.person_name,
            switch_event_id: event.id,
            access_tier: event.access_tier,
          },
        })

        await logEvent(db, 'switch_executed', {
          personId: event.person_id,
          details: { switch_event_id: event.id },
        })

        processed.push(event.id)
      } catch (err) {
        console.error(`Failed to process switch event ${event.id}:`, err)
        errors.push(event.id)
      }
    }

    await logEvent(db, 'cron_check', {
      details: {
        processed_count: processed.length,
        error_count: errors.length,
        checked_at: now,
      },
    })

    return NextResponse.json({
      success: true,
      processed: processed.length,
      errors: errors.length,
      processedIds: processed,
    })
  } catch (error) {
    console.error('cron check-switches error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
