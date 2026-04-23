import { NextRequest, NextResponse } from 'next/server'
import { getDB, queryChallengeQuestions, queryPersonById } from '@/lib/db'

export const runtime = 'edge'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
): Promise<NextResponse> {
  try {
    const { personId } = await params

    if (!personId) {
      return NextResponse.json({ error: 'Person ID is required' }, { status: 400 })
    }

    const db = getDB()
    const person = await queryPersonById(db, personId)

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    const questions = await queryChallengeQuestions(db, personId)

    if (questions.length === 0) {
      return NextResponse.json({ error: 'No challenge questions configured for this person' }, { status: 404 })
    }

    // Return questions without answer hashes
    const safeQuestions = questions.map((q) => ({
      id: q.id,
      question_order: q.question_order,
      question: q.question,
    }))

    return NextResponse.json({ questions: safeQuestions })
  } catch (error) {
    console.error('questions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
