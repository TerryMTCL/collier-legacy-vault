import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/hash'
import { getDB, queryPeople } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logEvent } from '@/lib/audit'

export const runtime = 'edge'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const db = getDB()
    const people = await queryPeople(db)
    return NextResponse.json({ people })
  } catch (error) {
    console.error('admin people GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json()
    const {
      name,
      email,
      access_tier = 'PERSONAL',
      personal_email_message,
      video_url,
      questions,
    } = body as {
      name?: string
      email?: string
      access_tier?: string
      personal_email_message?: string
      video_url?: string
      questions?: Array<{ question: string; answer: string }>
    }

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    if (!['FULL', 'PERSONAL'].includes(access_tier)) {
      return NextResponse.json({ error: 'access_tier must be FULL or PERSONAL' }, { status: 400 })
    }

    const db = getDB()
    const id = crypto.randomUUID()

    await db
      .prepare(
        `INSERT INTO people (id, name, email, access_tier, personal_email_message, video_url)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(id, name.trim(), email.trim().toLowerCase(), access_tier, personal_email_message ?? null, video_url ?? null)
      .run()

    // Insert challenge questions if provided
    if (questions && Array.isArray(questions) && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        if (!q.question || !q.answer) continue
        const qId = crypto.randomUUID()
        const answerHash = await hashPassword(q.answer.trim().toLowerCase())
        await db
          .prepare(
            `INSERT INTO challenge_questions (id, person_id, question_order, question, answer_hash)
             VALUES (?, ?, ?, ?, ?)`
          )
          .bind(qId, id, i + 1, q.question.trim(), answerHash)
          .run()
      }
    }

    const ip =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0] ??
      'unknown'

    await logEvent(db, 'person_created', {
      personId: id,
      ipAddress: ip,
      details: { name, email },
    })

    const person = await db.prepare('SELECT * FROM people WHERE id = ?').bind(id).first()
    return NextResponse.json({ person }, { status: 201 })
  } catch (error) {
    console.error('admin people POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
