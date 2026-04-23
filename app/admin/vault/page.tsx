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

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-gray-100">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors">
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

export default function VaultPage() {
  const [categories, setCategories] = useState<VaultCategory[]>([])
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [entriesLoading, setEntriesLoading] = useState(false)

  // Category modal
  const [showCatModal, setShowCatModal] = useState(false)
  const [catName, setCatName] = useState('')
  const [catIcon, setCatIcon] = useState('')
  const [catTier, setCatTier] = useState<'FULL' | 'PERSONAL'>('PERSONAL')
  const [catSaving, setCatSaving] = useState(false)

  // Entry modal
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null)
  const [entryTitle, setEntryTitle] = useState('')
  const [entryType, setEntryType] = useState('note')
  const [entryData, setEntryData] = useState('')
  const [entrySaving, setEntrySaving] = useState(false)
  const [entryError, setEntryError] = useState<string | null>(null)

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

  function openAddEntry() {
    setEditingEntry(null)
    setEntryTitle('')
    setEntryType('note')
    setEntryData('')
    setEntryError(null)
    setShowEntryModal(true)
  }

  async function openEditEntry(entry: VaultEntry) {
    setEditingEntry(entry)
    setEntryTitle(entry.title)
    setEntryType(entry.entry_type)
    setEntryError(null)

    // Fetch decrypted data
    try {
      const res = await fetch(`/api/admin/vault/entries/${entry.id}`)
      if (res.ok) {
        const data = await res.json()
        setEntryData(
          typeof data.entry.data === 'string'
            ? data.entry.data
            : JSON.stringify(data.entry.data, null, 2)
        )
      }
    } catch {
      setEntryData('')
    }
    setShowEntryModal(true)
  }

  async function handleSaveEntry(e: FormEvent) {
    e.preventDefault()
    if (!selectedCategory) return
    setEntrySaving(true)
    setEntryError(null)

    try {
      let parsedData: unknown = entryData
      try { parsedData = JSON.parse(entryData) } catch { /* keep as string */ }

      let res: Response
      if (editingEntry) {
        res = await fetch(`/api/admin/vault/entries/${editingEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: entryTitle, entry_type: entryType, data: parsedData }),
        })
      } else {
        res = await fetch('/api/admin/vault/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category_id: selectedCategory,
            title: entryTitle,
            entry_type: entryType,
            data: parsedData,
          }),
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
      loadEntries(selectedCategory)
    }
  }

  const selectedCat = categories.find((c) => c.id === selectedCategory)

  return (
    <AdminLayout currentPage="vault">
      <div className="flex h-full min-h-screen">
        {/* Category Sidebar */}
        <div className="w-64 border-r border-gray-800 bg-gray-900/50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">Categories</h2>
            <button
              onClick={() => setShowCatModal(true)}
              className="p-1 rounded-md text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
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
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors
                    ${selectedCategory === cat.id
                      ? 'bg-indigo-900/30 text-indigo-300 border-r-2 border-indigo-500'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    }`}
                >
                  <span className="text-base">{cat.icon ?? '📁'}</span>
                  <span className="truncate flex-1">{cat.name}</span>
                  {cat.access_tier === 'FULL' && (
                    <span className="text-xs text-indigo-500 flex-shrink-0">F</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Entry Area */}
        <div className="flex-1 flex flex-col">
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
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 flex items-center justify-between hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-gray-500 flex-shrink-0">
                        {entry.entry_type === 'login' && '🔑'}
                        {entry.entry_type === 'document' && '📄'}
                        {entry.entry_type === 'note' && '📝'}
                        {entry.entry_type === 'file' && '📎'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate">{entry.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{entry.entry_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => openEditEntry(entry)}
                        className="text-xs text-gray-400 hover:text-gray-200 px-2.5 py-1 rounded-md hover:bg-gray-800 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteEntry(entry.id)}
                        className="text-xs text-red-500 hover:text-red-400 px-2.5 py-1 rounded-md hover:bg-red-950/30 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
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
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Name</label>
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Category name"
                required
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Icon (emoji)</label>
              <input
                type="text"
                value={catIcon}
                onChange={(e) => setCatIcon(e.target.value)}
                placeholder="📁"
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Access Tier</label>
              <select
                value={catTier}
                onChange={(e) => setCatTier(e.target.value as 'FULL' | 'PERSONAL')}
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
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
        <Modal title={editingEntry ? 'Edit Entry' : 'Add Entry'} onClose={() => setShowEntryModal(false)}>
          <form onSubmit={handleSaveEntry} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Title</label>
              <input
                type="text"
                value={entryTitle}
                onChange={(e) => setEntryTitle(e.target.value)}
                placeholder="Entry title"
                required
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Type</label>
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="note">Note</option>
                <option value="login">Login</option>
                <option value="document">Document</option>
                <option value="file">File</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Content <span className="text-gray-600">(JSON or plain text)</span>
              </label>
              <textarea
                value={entryData}
                onChange={(e) => setEntryData(e.target.value)}
                placeholder={entryType === 'login' ? '{"username":"...","password":"...","url":"..."}' : 'Enter content here...'}
                rows={6}
                required
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-mono resize-none"
              />
              <p className="text-xs text-gray-600 mt-1">This will be encrypted at rest using AES-256-GCM.</p>
            </div>

            {entryError && (
              <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-3">{entryError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowEntryModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg px-4 py-2.5 text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={entrySaving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors">
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
