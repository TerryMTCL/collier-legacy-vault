import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/hash'
import { getDB, queryPersonById, queryChallengeQuestions } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logEvent } from '@/lib/audit'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id } = await params
    const db = getDB()
    const person = await queryPersonById(db, id)

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    const questions = await queryChallengeQuestions(db, id)
    const safeQuestions = questions.map((q) => ({
      id: q.id,
      question_order: q.question_order,
      question: q.question,
    }))

    return NextResponse.json({ person, questions: safeQuestions })
  } catch (error) {
    console.error('admin person GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id } = await params
    const db = getDB()

    const person = await queryPersonById(db, id)
    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      name,
      email,
      access_tier,
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

    await db
      .prepare(
        `UPDATE people SET
          name = COALESCE(?, name),
          email = COALESCE(?, email),
          access_tier = COALESCE(?, access_tier),
          personal_email_message = ?,
          video_url = ?,
          updated_at = datetime('now')
        WHERE id = ?`
      )
      .bind(
        name?.trim() ?? null,
        email?.trim().toLowerCase() ?? null,
        access_tier ?? null,
        personal_email_message ?? null,
        video_url ?? null,
        id
      )
      .run()

    // Replace challenge questions ONLY if new questions with actual content are provided
    // Never delete existing questions when the field is empty/missing (e.g. editing just the letter)
    if (questions && Array.isArray(questions) && questions.length > 0 && questions.some(q => q.question && q.answer)) {
      // Delete existing
      await db.prepare('DELETE FROM challenge_questions WHERE person_id = ?').bind(id).run()

      // Insert new
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

    await logEvent(db, 'person_updated', {
      personId: id,
      ipAddress: ip,
      details: { name: name ?? person.name },
    })

    const updated = await queryPersonById(db, id)
    return NextResponse.json({ person: updated })
  } catch (error) {
    console.error('admin person PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id } = await params
    const db = getDB()

    const person = await queryPersonById(db, id)
    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    await db.prepare('DELETE FROM people WHERE id = ?').bind(id).run()

    const ip =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0] ??
      'unknown'

    await logEvent(db, 'person_deleted', {
      ipAddress: ip,
      details: { name: person.name, email: person.email },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('admin person DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
