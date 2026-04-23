import { NextRequest, NextResponse } from 'next/server'
import { getDB, queryVaultEntries } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { encrypt } from '@/lib/encryption'
import { logEvent } from '@/lib/audit'

export const runtime = 'edge'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId') ?? undefined

    const db = getDB()
    const entries = await queryVaultEntries(db, categoryId)

    // Return entries with encrypted_data (admin can decrypt on frontend if needed)
    return NextResponse.json({ entries })
  } catch (error) {
    console.error('vault entries GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json()
    const { category_id, title, entry_type = 'note', data, file_keys, sort_order = 0 } = body as {
      category_id?: string
      title?: string
      entry_type?: string
      data?: Record<string, unknown> | string
      file_keys?: string
      sort_order?: number
    }

    if (!category_id || !title || data === undefined) {
      return NextResponse.json({ error: 'category_id, title, and data are required' }, { status: 400 })
    }

    const validTypes = ['login', 'document', 'note', 'file']
    if (!validTypes.includes(entry_type)) {
      return NextResponse.json({ error: 'entry_type must be login, document, note, or file' }, { status: 400 })
    }

    const db = getDB()

    // Verify category exists
    const category = await db
      .prepare('SELECT id FROM vault_categories WHERE id = ?')
      .bind(category_id)
      .first()

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const dataString = typeof data === 'string' ? data : JSON.stringify(data)
    const encryptedData = await encrypt(dataString)

    const id = crypto.randomUUID()

    await db
      .prepare(
        `INSERT INTO vault_entries (id, category_id, title, entry_type, encrypted_data, file_keys, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, category_id, title.trim(), entry_type, encryptedData, file_keys ?? null, sort_order)
      .run()

    const ip =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0] ??
      'unknown'

    await logEvent(db, 'vault_entry_created', {
      ipAddress: ip,
      details: { title, entry_type, category_id },
    })

    const entry = await db.prepare('SELECT * FROM vault_entries WHERE id = ?').bind(id).first()
    return NextResponse.json({ entry }, { status: 201 })
  } catch (error) {
    console.error('vault entries POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
