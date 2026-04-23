import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireAdmin, requirePerson } from '@/lib/auth'
import { getR2 } from '@/lib/r2'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
): Promise<Response> {
  // Accept either admin auth or person auth
  let isAdmin = false
  let authedPersonId: string | null = null

  const adminResult = await requireAdmin(request)
  if (!(adminResult instanceof NextResponse)) {
    isAdmin = true
  } else {
    const personResult = await requirePerson(request)
    if (personResult instanceof NextResponse) {
      return new Response('Unauthorized', { status: 401 })
    }
    authedPersonId = personResult.personId
  }

  try {
    const { personId } = await params
    const db = getDB()

    const person = await db
      .prepare('SELECT id, video_url, is_activated FROM people WHERE id = ?')
      .bind(personId)
      .first<{ id: string; video_url: string | null; is_activated: number }>()

    if (!person) {
      return new Response('Not Found', { status: 404 })
    }

    // Person auth: may only access their own video, and only if activated
    if (!isAdmin) {
      if (authedPersonId !== personId) {
        return new Response('Forbidden', { status: 403 })
      }
      if (!person.is_activated) {
        return new Response('Forbidden — vault not activated', { status: 403 })
      }
    }

    if (!person.video_url) {
      return new Response('No video found', { status: 404 })
    }

    const r2 = getR2()
    const rangeHeader = request.headers.get('range')

    if (rangeHeader) {
      // Handle Range request for video seeking
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
      if (match) {
        const start = parseInt(match[1], 10)
        const head = await r2.head(person.video_url)
        if (!head) return new Response('Not Found', { status: 404 })

        const fileSize = head.size
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1
        const chunkLength = end - start + 1

        const partial = await r2.get(person.video_url, {
          range: { offset: start, length: chunkLength },
        })

        if (!partial) return new Response('Not Found', { status: 404 })

        return new Response(partial.body, {
          status: 206,
          headers: {
            'Content-Type': head.httpMetadata?.contentType ?? 'video/mp4',
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Content-Length': String(chunkLength),
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'private, max-age=3600',
          },
        })
      }
    }

    // Full file response
    const object = await r2.get(person.video_url)
    if (!object) return new Response('Not Found', { status: 404 })

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType ?? 'video/mp4',
        'Content-Length': String(object.size),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('vault video GET error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
