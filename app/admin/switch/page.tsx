'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'

interface SwitchEvent {
  id: string
  person_id: string
  person_name: string | null
  person_email: string | null
  triggered_at: string
  expires_at: string
  status: 'pending' | 'cancelled' | 'executed'
  ip_address: string | null
  resolved_at: string | null
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-900/40 text-amber-300 border-amber-800/50',
  cancelled: 'bg-gray-800 text-gray-500 border-gray-700',
  executed: 'bg-green-900/40 text-green-300 border-green-800/50',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TimeRemaining({ expiresAt }: { expiresAt: string }) {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires.getTime() - now.getTime()

  if (diff <= 0) return <span className="text-red-400 text-xs">Expired</span>

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return (
    <span className="text-amber-400 text-xs">
      {hours}h {minutes}m remaining
    </span>
  )
}

export default function SwitchPage() {
  const [events, setEvents] = useState<SwitchEvent[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [testMode, setTestMode] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  async function loadEvents() {
    try {
      const res = await fetch('/api/admin/switch')
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events)
        setPendingCount(data.pendingCount)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
    const interval = setInterval(loadEvents, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [])

  async function runCronTest() {
    setTestMode(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/cron/check-switches', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? 'test'}`,
        },
      })
      const data = await res.json()
      setTestResult(`Processed ${data.processed} event(s). Errors: ${data.errors}.`)
      loadEvents()
    } catch {
      setTestResult('Failed to run cron check.')
    } finally {
      setTestMode(false)
    }
  }

  const pending = events.filter((e) => e.status === 'pending')
  const history = events.filter((e) => e.status !== 'pending')

  return (
    <AdminLayout currentPage="switch">
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-100">Switch Status</h1>
            <p className="text-sm text-gray-500 mt-1">Dead man&apos;s switch monitoring</p>
          </div>
          <button
            onClick={runCronTest}
            disabled={testMode}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 font-medium rounded-lg px-4 py-2 text-sm transition-colors border border-gray-700"
          >
            <svg className={`w-4 h-4 ${testMode ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {testMode ? 'Running...' : 'Run Cron Check'}
          </button>
        </div>

        {testResult && (
          <div className="mb-6 bg-blue-900/20 border border-blue-800/40 rounded-lg px-4 py-3 text-sm text-blue-300">
            {testResult}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs text-gray-500 mb-2">Pending</p>
            <p className="text-3xl font-bold text-amber-400">{pendingCount}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs text-gray-500 mb-2">Executed</p>
            <p className="text-3xl font-bold text-green-400">
              {events.filter((e) => e.status === 'executed').length}
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs text-gray-500 mb-2">Cancelled</p>
            <p className="text-3xl font-bold text-gray-400">
              {events.filter((e) => e.status === 'cancelled').length}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
            <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </div>
        ) : (
          <>
            {/* Pending Events */}
            {pending.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3">
                  Pending Events ({pending.length})
                </h2>
                <div className="space-y-3">
                  {pending.map((event) => (
                    <div
                      key={event.id}
                      className="bg-gray-900 border border-amber-900/40 rounded-xl p-5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-200">
                            {event.person_name ?? 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{event.person_email}</p>
                          <p className="text-xs text-gray-600 mt-1">IP: {event.ip_address ?? 'unknown'}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES.pending}`}>
                            pending
                          </span>
                          <div className="mt-2">
                            <TimeRemaining expiresAt={event.expires_at} />
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-2 gap-4 text-xs text-gray-500">
                        <div>
                          <span className="text-gray-600">Triggered:</span>{' '}
                          {formatDate(event.triggered_at)}
                        </div>
                        <div>
                          <span className="text-gray-600">Expires:</span>{' '}
                          {formatDate(event.expires_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Event History */}
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                History
              </h2>
              {history.length === 0 ? (
                <p className="text-sm text-gray-600">No historical events.</p>
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Person</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Triggered</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Resolved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {history.map((event) => (
                        <tr key={event.id} className="hover:bg-gray-800/20 transition-colors">
                          <td className="px-5 py-3">
                            <p className="text-sm text-gray-300">{event.person_name}</p>
                            <p className="text-xs text-gray-600">{event.ip_address}</p>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[event.status] ?? ''}`}>
                              {event.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-500">{formatDate(event.triggered_at)}</td>
                          <td className="px-5 py-3 text-xs text-gray-500">
                            {event.resolved_at ? formatDate(event.resolved_at) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
