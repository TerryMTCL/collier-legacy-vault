'use client'

import { useState, useEffect, FormEvent } from 'react'
import AdminLayout from '@/components/AdminLayout'

interface VaultCategory {
  id: string
  name: string
  icon: string | null
  sort_order: number
  access_tier: 'FULL' | 'PERSONAL'
}

interface VaultEntry {
  id: string
  category_id: string
  title: string
  entry_type: string
  sort_order: number
  created_at: string
  updated_at: string
}

type EntryData = Record<string, unknown> | string | null

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className={`relative bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full ${
          wide ? 'max-w-2xl' : 'max-w-lg'
        } max-h-[88vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-100">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  return (
    <button onClick={copy} className="p-1 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0" title="Copy">
      {copied ? (
        <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    )
  }
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function EntryDisplay({ type, data }: { type: string; data: EntryData }) {
  const [showPassword, setShowPassword] = useState(false)

  if (!data) {
    return <p className="text-xs text-gray-600 italic">No data stored</p>
  }

  const obj = typeof data === 'object' && data !== null ? data : null
  const str = typeof data === 'string' ? data : null

  if (type === 'login') {
    const username = obj?.username as string | undefined
    const password = obj?.password as string | undefined
    const url = obj?.url as string | undefined
    const notes = obj?.notes as string | undefined
    const totp = obj?.totp as string | undefined

    return (
      <div className="space-y-2.5 text-xs">
        {username && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 w-20 flex-shrink-0 font-medium">Username</span>
            <span className="text-gray-200 font-mono break-all">{username}</span>
            <CopyButton value={username} />
          </div>
        )}
        {password && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 w-20 flex-shrink-0 font-medium">Password</span>
            <span className="text-gray-200 font-mono">{showPassword ? password : '••••••••'}</span>
            <button
              onClick={() => setShowPassword((p) => !p)}
              className="p-1 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
              title={showPassword ? 'Hide' : 'Show'}
            >
              <EyeIcon open={showPassword} />
            </button>
            {showPassword && <CopyButton value={password} />}
          </div>
        )}
        {url && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 w-20 flex-shrink-0 font-medium">URL</span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 truncate max-w-xs"
            >
              {url}
            </a>
          </div>
        )}
        {totp && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 w-20 flex-shrink-0 font-medium">2FA/TOTP</span>
            <span className="text-gray-200 font-mono break-all">{totp}</span>
            <CopyButton value={totp} />
          </div>
        )}
        {notes && (
          <div>
            <span className="text-gray-500 font-medium block mb-1">Notes</span>
            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{notes}</p>
          </div>
        )}
        {!username && !password && !url && !notes && !totp && (
          <p className="text-gray-600 italic">Empty entry</p>
        )}
      </div>
    )
  }

  if (type === 'note') {
    const body = (obj?.body as string) ?? str ?? ''
    return <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{body || <span className="italic text-gray-600">Empty note</span>}</p>
  }

  if (type === 'document') {
    const notes = (obj?.notes as string) ?? str ?? ''
    return <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{notes || <span className="italic text-gray-600">No description</span>}</p>
  }

  if (type === 'file') {
    const description = (obj?.description as string) ?? str ?? ''
    return <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{description || <span className="italic text-gray-600">No description</span>}</p>
  }

  // Fallback for unknown types
  return (
    <pre className="text-xs text-gray-400 font-mono overflow-x-auto">
      {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
    </pre>
  )
}

const fieldClass =
  'w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30'
const labelClass = 'block text-sm font-medium text-gray-400 mb-1.5'

export default function VaultPage() {
  const [categories, setCategories] = useState<VaultCategory[]>([])
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [entriesLoading, setEntriesLoading] = useState(false)

  // Category modal (add)
  const [showCatModal, setShowCatModal] = useState(false)
  const [catName, setCatName] = useState('')
  const [catIcon, setCatIcon] = useState('')
  const [catTier, setCatTier] = useState<'FULL' | 'PERSONAL'>('PERSONAL')
  const [catSaving, setCatSaving] = useState(false)

  // Category tier toggling
  const [togglingCatId, setTogglingCatId] = useState<string | null>(null)

  // Entry modal
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null)
  const [entryTitle, setEntryTitle] = useState('')
  const [entryType, setEntryType] = useState<'note' | 'login' | 'document' | 'file'>('note')
  const [entrySaving, setEntrySaving] = useState(false)
  const [entryError, setEntryError] = useState<string | null>(null)
  const [entryLoading, setEntryLoading] = useState(false)

  // Login-specific fields
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginUrl, setLoginUrl] = useState('')
  const [loginNotes, setLoginNotes] = useState('')
  const [loginTotp, setLoginTotp] = useState('')
  const [showFormPassword, setShowFormPassword] = useState(false)

  // Note-specific fields
  const [noteBody, setNoteBody] = useState('')

  // Document-specific fields
  const [docNotes, setDocNotes] = useState('')

  // File-specific fields
  const [fileDescription, setFileDescription] = useState('')

  // Expanded entry display
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null)
  const [expandedData, setExpandedData] = useState<EntryData>(null)
  const [expandedLoading, setExpandedLoading] = useState(false)

  // Delete confirm
  const [deleteEntry, setDeleteEntry] = useState<string | null>(null)

  async function loadCategories() {
    try {
      const res = await fetch('/api/admin/vault/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories)
        if (!selectedCategory && data.categories.length > 0) {
          setSelectedCategory(data.categories[0].id)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadEntries(categoryId: string) {
    setEntriesLoading(true)
    setExpandedEntryId(null)
    setExpandedData(null)
    try {
      const res = await fetch(`/api/admin/vault/entries?categoryId=${categoryId}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries)
      }
    } finally {
      setEntriesLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      loadEntries(selectedCategory)
    }
  }, [selectedCategory])

  async function handleAddCategory(e: FormEvent) {
    e.preventDefault()
    setCatSaving(true)
    try {
      const res = await fetch('/api/admin/vault/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catName, icon: catIcon, access_tier: catTier }),
      })
      if (res.ok) {
        setShowCatModal(false)
        setCatName('')
        setCatIcon('')
        loadCategories()
      }
    } finally {
      setCatSaving(false)
    }
  }

  async function handleToggleCatTier(catId: string, currentTier: 'FULL' | 'PERSONAL') {
    if (togglingCatId) return
    setTogglingCatId(catId)
    try {
      const newTier = currentTier === 'FULL' ? 'PERSONAL' : 'FULL'
      const res = await fetch(`/api/admin/vault/categories/${catId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_tier: newTier }),
      })
      if (res.ok) {
        setCategories((prev) =>
          prev.map((c) => (c.id === catId ? { ...c, access_tier: newTier } : c))
        )
      }
    } finally {
      setTogglingCatId(null)
    }
  }

  function resetFormFields() {
    setLoginUsername('')
    setLoginPassword('')
    setLoginUrl('')
    setLoginNotes('')
    setLoginTotp('')
    setShowFormPassword(false)
    setNoteBody('')
    setDocNotes('')
    setFileDescription('')
  }

  function populateFormFromData(type: string, data: EntryData) {
    const obj = typeof data === 'object' && data !== null ? data : null
    const str = typeof data === 'string' ? data : null

    if (type === 'login' && obj) {
      setLoginUsername((obj.username as string) ?? '')
      setLoginPassword((obj.password as string) ?? '')
      setLoginUrl((obj.url as string) ?? '')
      setLoginNotes((obj.notes as string) ?? '')
      setLoginTotp((obj.totp as string) ?? '')
    } else if (type === 'note') {
      setNoteBody((obj?.body as string) ?? str ?? '')
    } else if (type === 'document') {
      setDocNotes((obj?.notes as string) ?? str ?? '')
    } else if (type === 'file') {
      setFileDescription((obj?.description as string) ?? str ?? '')
    }
  }

  function buildEntryData(): Record<string, unknown> | string {
    switch (entryType) {
      case 'login':
        return {
          username: loginUsername,
          password: loginPassword,
          url: loginUrl,
          ...(loginNotes && { notes: loginNotes }),
          ...(loginTotp && { totp: loginTotp }),
        }
      case 'note':
        return { body: noteBody }
      case 'document':
        return { notes: docNotes }
      case 'file':
        return { description: fileDescription }
    }
  }

  function openAddEntry() {
    setEditingEntry(null)
    setEntryTitle('')
    setEntryType('note')
    setEntryError(null)
    resetFormFields()
    setShowEntryModal(true)
  }

  async function openEditEntry(entry: VaultEntry) {
    setEditingEntry(entry)
    setEntryTitle(entry.title)
    setEntryType(entry.entry_type as 'note' | 'login' | 'document' | 'file')
    setEntryError(null)
    resetFormFields()
    setEntryLoading(true)
    setShowEntryModal(true)

    try {
      const res = await fetch(`/api/admin/vault/entries/${entry.id}`)
      if (res.ok) {
        const data = await res.json()
        populateFormFromData(entry.entry_type, data.entry.data)
      }
    } catch {
      // ignore, user can re-enter
    } finally {
      setEntryLoading(false)
    }
  }

  async function toggleExpandEntry(entry: VaultEntry) {
    if (expandedEntryId === entry.id) {
      setExpandedEntryId(null)
      setExpandedData(null)
      return
    }

    setExpandedEntryId(entry.id)
    setExpandedData(null)
    setExpandedLoading(true)

    try {
      const res = await fetch(`/api/admin/vault/entries/${entry.id}`)
      if (res.ok) {
        const data = await res.json()
        setExpandedData(data.entry.data)
      }
    } finally {
      setExpandedLoading(false)
    }
  }

  async function handleSaveEntry(e: FormEvent) {
    e.preventDefault()
    if (!selectedCategory) return
    setEntrySaving(true)
    setEntryError(null)

    try {
      const payload = {
        title: entryTitle,
        entry_type: entryType,
        data: buildEntryData(),
      }

      let res: Response
      if (editingEntry) {
        res = await fetch(`/api/admin/vault/entries/${editingEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/admin/vault/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category_id: selectedCategory, ...payload }),
        })
      }

      if (!res.ok) {
        const d = await res.json()
        setEntryError(d.error ?? 'Failed to save entry.')
        return
      }

      setShowEntryModal(false)
      loadEntries(selectedCategory)
    } catch {
      setEntryError('Something went wrong.')
    } finally {
      setEntrySaving(false)
    }
  }

  async function handleDeleteEntry(id: string) {
    const res = await fetch(`/api/admin/vault/entries/${id}`, { method: 'DELETE' })
    if (res.ok && selectedCategory) {
      setDeleteEntry(null)
      if (expandedEntryId === id) {
        setExpandedEntryId(null)
        setExpandedData(null)
      }
      loadEntries(selectedCategory)
    }
  }

  const selectedCat = categories.find((c) => c.id === selectedCategory)

  return (
    <AdminLayout currentPage="vault">
      <div className="flex h-full min-h-screen">
        {/* Category Sidebar */}
        <div className="w-64 border-r border-gray-800 bg-gray-900/50 flex flex-col flex-shrink-0">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">Categories</h2>
            <button
              onClick={() => setShowCatModal(true)}
              className="p-1 rounded-md text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
              title="Add category"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-600">Loading...</div>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`w-full flex items-center gap-1 px-2 py-0.5 transition-colors ${
                    selectedCategory === cat.id
                      ? 'border-r-2 border-indigo-500'
                      : ''
                  }`}
                >
                  <button
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 flex-1 text-left px-2 py-2 rounded-md text-sm truncate transition-colors ${
                      selectedCategory === cat.id
                        ? 'text-indigo-300 bg-indigo-900/20'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    }`}
                  >
                    <span className="text-base flex-shrink-0">{cat.icon ?? '📁'}</span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                  <button
                    onClick={() => handleToggleCatTier(cat.id, cat.access_tier)}
                    disabled={togglingCatId === cat.id}
                    title={`${cat.access_tier} tier — click to switch to ${cat.access_tier === 'FULL' ? 'PERSONAL' : 'FULL'}`}
                    className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                      cat.access_tier === 'FULL'
                        ? 'text-indigo-400 bg-indigo-900/40 hover:bg-indigo-900/70'
                        : 'text-gray-600 hover:text-gray-400 hover:bg-gray-800'
                    } disabled:opacity-40`}
                  >
                    {togglingCatId === cat.id ? '…' : cat.access_tier === 'FULL' ? 'FULL' : 'PER'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Entry Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <div>
              <h1 className="text-base font-semibold text-gray-100">
                {selectedCat ? `${selectedCat.icon ?? ''} ${selectedCat.name}` : 'Select a Category'}
              </h1>
              {selectedCat && (
                <p className="text-xs text-gray-500 mt-0.5">{selectedCat.access_tier} tier</p>
              )}
            </div>
            {selectedCategory && (
              <button
                onClick={openAddEntry}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg px-3 py-2 text-sm transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Entry
              </button>
            )}
          </div>

          <div className="flex-1 p-6">
            {!selectedCategory ? (
              <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                Select a category to view entries
              </div>
            ) : entriesLoading ? (
              <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading entries...
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <p className="text-gray-600 text-sm">No entries in this category.</p>
                <button
                  onClick={openAddEntry}
                  className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Add the first entry
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => {
                  const isExpanded = expandedEntryId === entry.id
                  return (
                    <div
                      key={entry.id}
                      className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-gray-700 transition-colors"
                    >
                      {/* Entry header row */}
                      <div
                        className="flex items-center justify-between px-5 py-4 cursor-pointer"
                        onClick={() => toggleExpandEntry(entry)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-gray-500 flex-shrink-0 text-base">
                            {entry.entry_type === 'login' && '🔑'}
                            {entry.entry_type === 'document' && '📄'}
                            {entry.entry_type === 'note' && '📝'}
                            {entry.entry_type === 'file' && '📎'}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-200 truncate">{entry.title}</p>
                            <p className="text-xs text-gray-600 mt-0.5 capitalize">{entry.entry_type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditEntry(entry) }}
                            className="text-xs text-gray-400 hover:text-gray-200 px-2.5 py-1 rounded-md hover:bg-gray-800 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteEntry(entry.id) }}
                            className="text-xs text-red-500 hover:text-red-400 px-2.5 py-1 rounded-md hover:bg-red-950/30 transition-colors"
                          >
                            Delete
                          </button>
                          <svg
                            className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="px-5 pb-4 border-t border-gray-800/60 pt-3">
                          {expandedLoading ? (
                            <p className="text-xs text-gray-600">Loading...</p>
                          ) : (
                            <EntryDisplay type={entry.entry_type} data={expandedData} />
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Category Modal */}
      {showCatModal && (
        <Modal title="Add Category" onClose={() => setShowCatModal(false)}>
          <form onSubmit={handleAddCategory} className="space-y-4">
            <div>
              <label className={labelClass}>Name</label>
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Category name"
                required
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Icon (emoji)</label>
              <input
                type="text"
                value={catIcon}
                onChange={(e) => setCatIcon(e.target.value)}
                placeholder="📁"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Access Tier</label>
              <select
                value={catTier}
                onChange={(e) => setCatTier(e.target.value as 'FULL' | 'PERSONAL')}
                className={fieldClass}
              >
                <option value="PERSONAL">PERSONAL</option>
                <option value="FULL">FULL</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCatModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg px-4 py-2.5 text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={catSaving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors">
                {catSaving ? 'Adding...' : 'Add Category'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add/Edit Entry Modal */}
      {showEntryModal && (
        <Modal
          title={editingEntry ? `Edit: ${editingEntry.title}` : 'Add Entry'}
          onClose={() => setShowEntryModal(false)}
          wide
        >
          <form onSubmit={handleSaveEntry} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Title</label>
                <input
                  type="text"
                  value={entryTitle}
                  onChange={(e) => setEntryTitle(e.target.value)}
                  placeholder="Entry title"
                  required
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <select
                  value={entryType}
                  onChange={(e) => {
                    setEntryType(e.target.value as typeof entryType)
                    setShowFormPassword(false)
                  }}
                  className={fieldClass}
                >
                  <option value="note">📝 Note</option>
                  <option value="login">🔑 Login</option>
                  <option value="document">📄 Document</option>
                  <option value="file">📎 File</option>
                </select>
              </div>
            </div>

            {entryLoading ? (
              <div className="py-6 text-center text-sm text-gray-500">Loading entry data...</div>
            ) : (
              <>
                {/* Login fields */}
                {entryType === 'login' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Username</label>
                        <input
                          type="text"
                          value={loginUsername}
                          onChange={(e) => setLoginUsername(e.target.value)}
                          placeholder="username or email"
                          autoComplete="off"
                          className={fieldClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Password</label>
                        <div className="relative">
                          <input
                            type={showFormPassword ? 'text' : 'password'}
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="password"
                            autoComplete="new-password"
                            className={`${fieldClass} pr-9`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowFormPassword((p) => !p)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                          >
                            <EyeIcon open={showFormPassword} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>URL</label>
                      <input
                        type="url"
                        value={loginUrl}
                        onChange={(e) => setLoginUrl(e.target.value)}
                        placeholder="https://example.com"
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        2FA / TOTP <span className="text-gray-600 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={loginTotp}
                        onChange={(e) => setLoginTotp(e.target.value)}
                        placeholder="Authenticator app name, backup codes, or TOTP secret"
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        Notes <span className="text-gray-600 font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={loginNotes}
                        onChange={(e) => setLoginNotes(e.target.value)}
                        placeholder="Additional notes..."
                        rows={3}
                        className={`${fieldClass} resize-y`}
                      />
                    </div>
                  </div>
                )}

                {/* Note fields */}
                {entryType === 'note' && (
                  <div>
                    <label className={labelClass}>Body</label>
                    <textarea
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                      placeholder="Write your note here..."
                      rows={10}
                      className={`${fieldClass} resize-y`}
                    />
                  </div>
                )}

                {/* Document fields */}
                {entryType === 'document' && (
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>
                        Description / Notes <span className="text-gray-600 font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={docNotes}
                        onChange={(e) => setDocNotes(e.target.value)}
                        placeholder="Describe this document..."
                        rows={5}
                        className={`${fieldClass} resize-y`}
                      />
                    </div>
                    <div className="border-2 border-dashed border-gray-700 rounded-lg p-5 text-center">
                      <p className="text-sm text-gray-500">📄 File upload</p>
                      <p className="text-xs text-gray-600 mt-1">Coming soon — files will be encrypted and stored in R2</p>
                    </div>
                  </div>
                )}

                {/* File fields */}
                {entryType === 'file' && (
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>
                        Description <span className="text-gray-600 font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={fileDescription}
                        onChange={(e) => setFileDescription(e.target.value)}
                        placeholder="Describe this file..."
                        rows={4}
                        className={`${fieldClass} resize-y`}
                      />
                    </div>
                    <div className="border-2 border-dashed border-gray-700 rounded-lg p-5 text-center">
                      <p className="text-sm text-gray-500">📎 File upload</p>
                      <p className="text-xs text-gray-600 mt-1">Coming soon — files will be encrypted and stored in R2</p>
                    </div>
                  </div>
                )}
              </>
            )}

            <p className="text-xs text-gray-600">All data is encrypted at rest with AES-256-GCM.</p>

            {entryError && (
              <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-3">{entryError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowEntryModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg px-4 py-2.5 text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={entrySaving || entryLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors">
                {entrySaving ? 'Saving...' : editingEntry ? 'Save Changes' : 'Add Entry'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Entry Confirm */}
      {deleteEntry && (
        <Modal title="Delete Entry" onClose={() => setDeleteEntry(null)}>
          <p className="text-sm text-gray-400 mb-6">Are you sure you want to delete this entry? This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteEntry(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg px-4 py-2.5 text-sm transition-colors">Cancel</button>
            <button onClick={() => handleDeleteEntry(deleteEntry)} className="flex-1 bg-red-700 hover:bg-red-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors">Delete</button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  )
}
