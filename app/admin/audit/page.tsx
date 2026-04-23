'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import AdminLayout from '@/components/AdminLayout'

interface AuditLog {
  id: string
  event_type: string
  person_id: string | null
  person_name: string | null
  ip_address: string | null
  user_agent: string | null
  details: string | null
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

const EVENT_TYPE_STYLES: Record<string, string> = {
  verify_success: 'text-green-400 bg-green-900/20',
  verify_failed: 'text-red-400 bg-red-900/20',
  verify_locked: 'text-red-500 bg-red-900/30',
  switch_triggered: 'text-amber-400 bg-amber-900/20',
  switch_cancelled: 'text-blue-400 bg-blue-900/20',
  switch_executed: 'text-purple-400 bg-purple-900/20',
  admin_login: 'text-indigo-400 bg-indigo-900/20',
  admin_login_failed: 'text-red-400 bg-red-900/20',
  access_granted: 'text-green-400 bg-green-900/30',
  person_created: 'text-blue-400 bg-blue-900/20',
  person_updated: 'text-blue-300 bg-blue-900/10',
  person_deleted: 'text-red-400 bg-red-900/20',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function parseDetails(details: string | null): string {
  if (!details) return '—'
  try {
    const parsed = JSON.parse(details)
    return JSON.stringify(parsed, null, 0)
      .replace(/[{}"]/g, '')
      .replace(/,/g, ', ')
  } catch {
    return details
  }
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filterType, setFilterType] = useState('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
      })
      if (filterType) params.set('eventType', filterType)

      const res = await fetch(`/api/admin/audit?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
        setPagination(data.pagination)
      }
    } finally {
      setLoading(false)
    }
  }, [page, filterType])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  function handleFilterChange(value: string) {
    setFilterType(value)
    setPage(1)
  }

  const eventTypes = [
    '', 'verify_success', 'verify_failed', 'verify_locked', 'verify_name_found', 'verify_name_not_found',
    'switch_triggered', 'switch_cancelled', 'switch_executed',
    'admin_login', 'admin_login_failed', 'admin_logout',
    'person_created', 'person_updated', 'person_deleted',
    'vault_entry_created', 'vault_entry_updated', 'vault_entry_deleted',
    'access_granted', 'cron_check',
  ]

  return (
    <AdminLayout currentPage="audit">
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-100">Audit Log</h1>
            <p className="text-sm text-gray-500 mt-1">
              {pagination ? `${pagination.total.toLocaleString()} total events` : 'Loading...'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filterType}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">All event types</option>
              {eventTypes.slice(1).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button
              onClick={loadLogs}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors border border-gray-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
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
        ) : logs.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-gray-500 text-sm">No audit log entries found.</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Person</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {logs.map((log) => (
                  <Fragment key={log.id}>
                    <tr
                      className="hover:bg-gray-800/20 transition-colors cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                    >
                      <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                          ${EVENT_TYPE_STYLES[log.event_type] ?? 'text-gray-400 bg-gray-800'}`}>
                          {log.event_type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400">
                        {log.person_name ?? (log.person_id ? log.person_id.slice(0, 8) + '...' : '—')}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500 font-mono">
                        {log.ip_address ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600 max-w-xs truncate">
                        {parseDetails(log.details)}
                      </td>
                    </tr>
                    {expandedRow === log.id && (
                      <tr className="bg-gray-800/10">
                        <td colSpan={5} className="px-5 py-3">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-gray-600">Event ID:</span>{' '}
                              <span className="text-gray-400 font-mono">{log.id}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Person ID:</span>{' '}
                              <span className="text-gray-400 font-mono">{log.person_id ?? '—'}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-600">User Agent:</span>{' '}
                              <span className="text-gray-500">{log.user_agent ?? '—'}</span>
                            </div>
                            {log.details && (
                              <div className="col-span-2">
                                <span className="text-gray-600">Details:</span>
                                <pre className="mt-1 text-gray-400 bg-gray-900 rounded p-2 overflow-x-auto">
                                  {(() => {
                                    try { return JSON.stringify(JSON.parse(log.details), null, 2) }
                                    catch { return log.details }
                                  })()}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-800">
                <p className="text-xs text-gray-500">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!pagination.hasPrev}
                    className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 rounded-md transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!pagination.hasNext}
                    className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 rounded-md transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
