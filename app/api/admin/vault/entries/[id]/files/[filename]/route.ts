import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { getR2 } from '@/lib/r2'
import { logEvent } from '@/lib/audit'

export const runtime = 'edge'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> }
): Promise<NextResponse> {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id, filename } = await params
    const db = getDB()

    const entry = await db
      .prepare('SELECT id, category_id, file_keys FROM vault_entries WHERE id = ?')
      .bind(id)
      .first<{ id: string; category_id: string; file_keys: string | null }>()

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

    // Build the expected R2 key
    const r2Key = `vault/${entry.category_id}/${id}/${filename}`
    if (!fileKeys.includes(r2Key)) {
      return NextResponse.json({ error: 'File not found in entry' }, { status: 404 })
    }

    // Delete from R2
    const r2 = getR2()
    await r2.delete(r2Key)

    // Update file_keys
    const updatedKeys = fileKeys.filter((k) => k !== r2Key)
    await db
      .prepare("UPDATE vault_entries SET file_keys = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(updatedKeys.length > 0 ? JSON.stringify(updatedKeys) : null, id)
      .run()

    const ip =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0] ??
      'unknown'

    await logEvent(db, 'file_deleted', {
      ipAddress: ip,
      details: { entryId: id, key: r2Key },
    })

    return NextResponse.json({
      success: true,
      files: updatedKeys.map((k) => ({ key: k, filename: k.split('/').pop() ?? k })),
    })
  } catch (error) {
    console.error('file delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
