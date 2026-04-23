import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { getR2 } from '@/lib/r2'
import { logEvent } from '@/lib/audit'

export const runtime = 'edge'

// GET — list files for an entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id } = await params
    const db = getDB()

    const entry = await db
      .prepare('SELECT file_keys FROM vault_entries WHERE id = ?')
      .bind(id)
      .first<{ file_keys: string | null }>()

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    let fileKeys: string[] = []
    if (entry.file_keys) {
      try {
        fileKeys = JSON.parse(entry.file_keys)
      } catch {
        fileKeys = []
      }
    }

    const files = fileKeys.map((key) => ({
      key,
      filename: key.split('/').pop() ?? key,
    }))

    return NextResponse.json({ files })
  } catch (error) {
    console.error('files GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — upload a file to R2 for this entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id } = await params
    const db = getDB()

    const entry = await db
      .prepare('SELECT id, category_id, entry_type, file_keys FROM vault_entries WHERE id = ?')
      .bind(id)
      .first<{ id: string; category_id: string; entry_type: string; file_keys: string | null }>()

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Max 100MB per file
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 100MB per file.' }, { status: 400 })
    }

    // Parse existing file_keys
    let fileKeys: string[] = []
    if (entry.file_keys) {
      try {
        fileKeys = JSON.parse(entry.file_keys)
      } catch {
        fileKeys = []
      }
    }

    // Max 5 files per entry
    if (fileKeys.length >= 5) {
      return NextResponse.json(
        { error: 'Maximum 5 files per entry reached.' },
        { status: 400 }
      )
    }

    const r2 = getR2()

    // Sanitize filename
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const r2Key = `vault/${entry.category_id}/${id}/${safeFilename}`

    // Upload to R2
    await r2.put(r2Key, file, {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
    })

    // Update file_keys in DB
    if (!fileKeys.includes(r2Key)) {
      fileKeys.push(r2Key)
    }
    await db
      .prepare("UPDATE vault_entries SET file_keys = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(JSON.stringify(fileKeys), id)
      .run()

    const ip =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0] ??
      'unknown'

    await logEvent(db, 'file_uploaded', {
      ipAddress: ip,
      details: { entryId: id, key: r2Key, size: file.size, filename: safeFilename },
    })

    return NextResponse.json({
      success: true,
      key: r2Key,
      filename: safeFilename,
      files: fileKeys.map((k) => ({ key: k, filename: k.split('/').pop() ?? k })),
    })
  } catch (error) {
    console.error('file upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
