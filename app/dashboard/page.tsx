'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PersonInfo {
  id: string
  name: string
  email: string
  access_tier: 'FULL' | 'PERSONAL'
  is_activated: number
  hasVideo: boolean
}

interface Category {
  id: string
  name: string
  icon: string | null
  sort_order: number
  access_tier: string
}

export default function DashboardPage() {
  const [person, setPerson] = useState<PersonInfo | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch('/api/vault/me')
        if (res.status === 401) {
          router.push('/')
          return
        }
        if (res.ok) {
          const data = await res.json()
          setPerson(data.person)
          setCategories(data.categories)
        }
      } catch {
        router.push('/')
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [router])

  if (loading) {
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
          <span className="text-sm">Loading your vault...</span>
        </div>
      </div>
    )
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-400 text-sm">Access denied.</p>
          <p className="text-gray-600 text-xs mt-2">Please use your personal access link.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-100">Collier Legacy Vault</h1>
            <p className="text-sm text-gray-400 mt-0.5">Welcome, {person.name}</p>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
              person.access_tier === 'FULL'
                ? 'text-indigo-300 bg-indigo-900/30 border-indigo-800/50'
                : 'text-gray-400 bg-gray-800 border-gray-700'
            }`}
          >
            {person.access_tier} ACCESS
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {/* Personal Video Message */}
        {person.hasVideo && (
          <section>
            <h2 className="text-base font-semibold text-gray-200 mb-4 flex items-center gap-2">
              <span>🎥</span>
              <span>A Personal Message For You</span>
            </h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
              <video
                controls
                className="w-full bg-black"
                style={{ maxHeight: '480px' }}
                preload="metadata"
                src={`/api/vault/video/${person.id}`}
              >
                Your browser does not support video playback.
              </video>
              <div className="px-4 py-3 border-t border-gray-800">
                <p className="text-xs text-gray-500">
                  A personal video message from Josh Collier
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Vault Contents */}
        <section>
          <h2 className="text-base font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <span>🔒</span>
            <span>Vault Contents</span>
          </h2>

          {categories.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
              <p className="text-gray-500 text-sm">No vault contents are available at this time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4"
                >
                  <span className="text-2xl flex-shrink-0">{cat.icon ?? '📁'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200">{cat.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">
                      {cat.access_tier.toLowerCase()} tier
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer note */}
        <footer className="border-t border-gray-800 pt-6 text-center">
          <p className="text-xs text-gray-600">
            This vault is private and secure. All contents are end-to-end encrypted.
          </p>
        </footer>
      </div>
    </div>
  )
}
