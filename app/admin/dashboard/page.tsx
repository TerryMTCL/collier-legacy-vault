import AdminLayout from '@/components/AdminLayout'
import Link from 'next/link'

async function getDashboardStats() {
  // These would normally fetch from DB in a server component
  // Since we need Cloudflare D1, return placeholder structure
  return {
    activePeople: 0,
    pendingSwitchEvents: 0,
    recentAuditLogs: [] as Array<{
      id: string
      event_type: string
      person_name: string | null
      ip_address: string | null
      created_at: string
    }>,
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  return (
    <AdminLayout currentPage="dashboard">
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-gray-100 mb-8">Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <Link href="/admin/people" className="block">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-400">Active People</span>
                <div className="w-8 h-8 bg-indigo-900/30 border border-indigo-800/50 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-100">{stats.activePeople}</p>
              <p className="text-xs text-gray-500 mt-1">Registered beneficiaries</p>
            </div>
          </Link>

          <Link href="/admin/switch" className="block">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-400">Pending Switches</span>
                <div className="w-8 h-8 bg-amber-900/30 border border-amber-800/50 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-100">{stats.pendingSwitchEvents}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting resolution</p>
            </div>
          </Link>

          <Link href="/admin/audit" className="block">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-400">Audit Log</span>
                <div className="w-8 h-8 bg-slate-800/50 border border-slate-700/50 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-400">View all events</p>
              <p className="text-xs text-gray-500 mt-1">Full activity history</p>
            </div>
          </Link>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/admin/people">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-indigo-700/50 transition-colors group">
              <h3 className="text-sm font-medium text-gray-300 group-hover:text-indigo-300 transition-colors mb-1">
                Manage People
              </h3>
              <p className="text-xs text-gray-500">Add or edit beneficiaries and their challenge questions</p>
            </div>
          </Link>

          <Link href="/admin/vault">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-indigo-700/50 transition-colors group">
              <h3 className="text-sm font-medium text-gray-300 group-hover:text-indigo-300 transition-colors mb-1">
                Manage Vault
              </h3>
              <p className="text-xs text-gray-500">Add and organize vault entries by category</p>
            </div>
          </Link>

          <Link href="/admin/switch">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-indigo-700/50 transition-colors group">
              <h3 className="text-sm font-medium text-gray-300 group-hover:text-indigo-300 transition-colors mb-1">
                Switch Status
              </h3>
              <p className="text-xs text-gray-500">View and manage dead man's switch events</p>
            </div>
          </Link>

          <Link href="/admin/audit">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-indigo-700/50 transition-colors group">
              <h3 className="text-sm font-medium text-gray-300 group-hover:text-indigo-300 transition-colors mb-1">
                Audit Log
              </h3>
              <p className="text-xs text-gray-500">Full activity log for all system events</p>
            </div>
          </Link>
        </div>
      </div>
    </AdminLayout>
  )
}
