import { NextRequest, NextResponse } from 'next/server'
import { getDB, queryPersonById } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { getR2 } from '@/lib/r2'
import { logEvent } from '@/lib/audit'

export const runtime = 'edge'

export async function POST(
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

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm']
    const isAllowedType =
      allowedTypes.includes(file.type) || /\.(mp4|mov|webm)$/i.test(file.name)
    if (!isAllowedType) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: .mp4, .mov, .webm' },
        { status: 400 }
      )
    }

    // Validate file size (500MB max)
    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 500MB.' }, { status: 400 })
    }

    const r2 = getR2()

    // Delete existing video from R2 if present
    if (person.video_url) {
      try {
        await r2.delete(person.video_url)
      } catch {
        // Ignore — old file may already be gone
      }
    }

    // Sanitize filename and build R2 key
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const r2Key = `videos/${id}/${safeFilename}`

    // Upload to R2
    await r2.put(r2Key, file, {
      httpMetadata: {
        contentType: file.type || 'video/mp4',
      },
    })

    // Update people record with R2 key
    await db
      .prepare("UPDATE people SET video_url = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(r2Key, id)
      .run()

    const ip =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0] ??
      'unknown'

    await logEvent(db, 'video_uploaded', {
      personId: id,
      ipAddress: ip,
      details: { key: r2Key, size: file.size, filename: safeFilename },
    })

    return NextResponse.json({ success: true, key: r2Key, filename: safeFilename })
  } catch (error) {
    console.error('video upload error:', error)
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

    if (!person.video_url) {
      return NextResponse.json({ error: 'No video found for this person' }, { status: 404 })
    }

    const r2 = getR2()
    await r2.delete(person.video_url)

    await db
      .prepare("UPDATE people SET video_url = NULL, updated_at = datetime('now') WHERE id = ?")
      .bind(id)
      .run()

    const ip =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0] ??
      'unknown'

    await logEvent(db, 'video_deleted', {
      personId: id,
      ipAddress: ip,
      details: { key: person.video_url },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('video delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
