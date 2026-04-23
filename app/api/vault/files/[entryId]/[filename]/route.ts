import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireAdmin, requirePerson } from '@/lib/auth'
import { getR2 } from '@/lib/r2'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string; filename: string }> }
): Promise<Response> {
  // Accept admin auth or person auth
  let isAdmin = false
  let personAccessTier: 'FULL' | 'PERSONAL' | null = null

  const adminResult = await requireAdmin(request)
  if (!(adminResult instanceof NextResponse)) {
    isAdmin = true
  } else {
    const personResult = await requirePerson(request)
    if (personResult instanceof NextResponse) {
      return new Response('Unauthorized', { status: 401 })
    }
    personAccessTier = personResult.accessTier
  }

  try {
    const { entryId, filename } = await params
    const db = getDB()

    // Get entry joined with its category for tier check
    const entry = await db
      .prepare(
        `SELECT ve.id, ve.category_id, ve.file_keys, vc.access_tier AS category_tier
         FROM vault_entries ve
         JOIN vault_categories vc ON ve.category_id = vc.id
         WHERE ve.id = ?`
      )
      .bind(entryId)
      .first<{
        id: string
        category_id: string
        file_keys: string | null
        category_tier: 'FULL' | 'PERSONAL'
      }>()

    if (!entry) {
      return new Response('Not Found', { status: 404 })
    }

    // Tier check for person sessions
    if (!isAdmin && personAccessTier !== null) {
      if (personAccessTier === 'PERSONAL' && entry.category_tier === 'FULL') {
        return new Response('Forbidden — insufficient access tier', { status: 403 })
      }
    }

    // Verify this file is in the entry's file_keys
    let fileKeys: string[] = []
    if (entry.file_keys) {
      try {
        fileKeys = JSON.parse(entry.file_keys)
      } catch {
        fileKeys = []
      }
    }

    const r2Key = `vault/${entry.category_id}/${entryId}/${filename}`
    if (!fileKeys.includes(r2Key)) {
      return new Response('Not Found', { status: 404 })
    }

    // Stream from R2
    const r2 = getR2()
    const object = await r2.get(r2Key)
    if (!object) return new Response('Not Found', { status: 404 })

    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
        'Content-Length': String(object.size),
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('vault files GET error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
