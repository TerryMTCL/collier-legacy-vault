'use client'

export const runtime = 'edge'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function AccessPage() {
  const params = useParams()

  useEffect(() => {
    const token = params.token as string
    if (token) {
      // Navigate to API route which validates token, sets httpOnly cookie, and redirects to /dashboard
      window.location.href = `/api/access/${token}`
    }
  }, [params.token])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-400">
        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="text-sm">Verifying access...</span>
      </div>
    </div>
  )
}
