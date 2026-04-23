import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { encrypt, decrypt } from '@/lib/encryption'
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

    const entry = await db
      .prepare('SELECT * FROM vault_entries WHERE id = ?')
      .bind(id)
      .first<{
        id: string
        category_id: string
        title: string
        entry_type: string
        encrypted_data: string
        file_keys: string | null
        sort_order: number
        created_at: string
        updated_at: string
      }>()

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Decrypt for admin view
    let decryptedData: unknown = null
    try {
      const raw = await decrypt(entry.encrypted_data)
      try {
        decryptedData = JSON.parse(raw)
      } catch {
        decryptedData = raw
      }
    } catch {
      decryptedData = null
    }

    return NextResponse.json({ entry: { ...entry, data: decryptedData } })
  } catch (error) {
    console.error('vault entry GET error:', error)
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

    const entry = await db.prepare('SELECT * FROM vault_entries WHERE id = ?').bind(id).first()
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const body = await request.json()
    const { title, entry_type, data, file_keys, sort_order } = body as {
      title?: string
      entry_type?: string
      data?: Record<string, unknown> | string
      file_keys?: string
      sort_order?: number
    }

    let encryptedData: string | null = null
    if (data !== undefined) {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data)
      encryptedData = await encrypt(dataString)
    }

    await db
      .prepare(
        `UPDATE vault_entries SET
          title = COALESCE(?, title),
          entry_type = COALESCE(?, entry_type),
          encrypted_data = COALESCE(?, encrypted_data),
          file_keys = COALESCE(?, file_keys),
          sort_order = COALESCE(?, sort_order),
          updated_at = datetime('now')
        WHERE id = ?`
      )
      .bind(
        title?.trim() ?? null,
        entry_type ?? null,
        encryptedData,
        file_keys ?? null,
        sort_order ?? null,
        id
      )
      .run()

    const ip =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0] ??
      'unknown'

    await logEvent(db, 'vault_entry_updated', {
      ipAddress: ip,
      details: { id, title },
    })

    const updated = await db.prepare('SELECT * FROM vault_entries WHERE id = ?').bind(id).first()
    return NextResponse.json({ entry: updated })
  } catch (error) {
    console.error('vault entry PUT error:', error)
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

    const entry = await db
      .prepare('SELECT * FROM vault_entries WHERE id = ?')
      .bind(id)
      .first<{ title: string }>()

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    await db.prepare('DELETE FROM vault_entries WHERE id = ?').bind(id).run()

    const ip =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0] ??
      'unknown'

    await logEvent(db, 'vault_entry_deleted', {
      ipAddress: ip,
      details: { id, title: entry.title },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('vault entry DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
