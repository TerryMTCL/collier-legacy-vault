'use client'

import { useState, useEffect, FormEvent } from 'react'
import AdminLayout from '@/components/AdminLayout'

interface Person {
  id: string
  name: string
  email: string
  access_tier: 'FULL' | 'PERSONAL'
  is_activated: number
  personal_email_message: string | null
  created_at: string
}

interface QuestionPair {
  question: string
  answer: string
}

const emptyQuestion: QuestionPair = { question: '', answer: '' }

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
      <div className="relative bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
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

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formTier, setFormTier] = useState<'FULL' | 'PERSONAL'>('PERSONAL')
  const [formMessage, setFormMessage] = useState('')
  const [formQuestions, setFormQuestions] = useState<QuestionPair[]>(
    Array(5).fill(null).map(() => ({ ...emptyQuestion }))
  )

  async function loadPeople() {
    try {
      const res = await fetch('/api/admin/people')
      if (res.ok) {
        const data = await res.json()
        setPeople(data.people)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPeople()
  }, [])

  function openAddModal() {
    setEditingPerson(null)
    setFormName('')
    setFormEmail('')
    setFormTier('PERSONAL')
    setFormMessage('')
    setFormQuestions(Array(5).fill(null).map(() => ({ ...emptyQuestion })))
    setError(null)
    setShowModal(true)
  }

  async function openEditModal(person: Person) {
    setEditingPerson(person)
    setFormName(person.name)
    setFormEmail(person.email)
    setFormTier(person.access_tier)
    setFormMessage(person.personal_email_message ?? '')
    setError(null)

    // Fetch existing questions
    try {
      const res = await fetch(`/api/admin/people/${person.id}`)
      if (res.ok) {
        const data = await res.json()
        const qs = data.questions ?? []
        const filled: QuestionPair[] = Array(5).fill(null).map((_, i) => ({
          question: qs[i]?.question ?? '',
          answer: '',
        }))
        setFormQuestions(filled)
      }
    } catch {
      setFormQuestions(Array(5).fill(null).map(() => ({ ...emptyQuestion })))
    }

    setShowModal(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      name: formName,
      email: formEmail,
      access_tier: formTier,
      personal_email_message: formMessage || null,
      questions: formQuestions.filter((q) => q.question.trim()),
    }

    try {
      let res: Response
      if (editingPerson) {
        res = await fetch(`/api/admin/people/${editingPerson.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/admin/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to save person.')
        return
      }

      setShowModal(false)
      loadPeople()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/people/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteConfirm(null)
        loadPeople()
      }
    } catch {
      console.error('Delete failed')
    }
  }

  return (
    <AdminLayout currentPage="people">
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-gray-100">People</h1>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Person
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </div>
        ) : people.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-gray-500 text-sm">No people added yet.</p>
            <button
              onClick={openAddModal}
              className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Add the first person
            </button>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {people.map((person) => (
                  <tr key={person.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-200">{person.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{person.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${person.access_tier === 'FULL'
                          ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-800/50'
                          : 'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}>
                        {person.access_tier}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${person.is_activated
                          ? 'bg-green-900/40 text-green-300 border border-green-800/50'
                          : 'bg-gray-800 text-gray-500 border border-gray-700'
                        }`}>
                        {person.is_activated ? 'Activated' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(person)}
                          className="text-xs text-gray-400 hover:text-gray-200 px-2.5 py-1 rounded-md hover:bg-gray-800 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(person.id)}
                          className="text-xs text-red-500 hover:text-red-400 px-2.5 py-1 rounded-md hover:bg-red-950/30 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal
          title={editingPerson ? `Edit: ${editingPerson.name}` : 'Add Person'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="jane@example.com"
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Access Tier</label>
              <select
                value={formTier}
                onChange={(e) => setFormTier(e.target.value as 'FULL' | 'PERSONAL')}
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
              >
                <option value="PERSONAL">PERSONAL — Personal documents only</option>
                <option value="FULL">FULL — All documents including business</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Personal Letter{' '}
                <span className="text-gray-600 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                This is the personal message that will be emailed to this person when the vault is activated.
              </p>
              <textarea
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                placeholder="Write a personal message to this person..."
                rows={15}
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 resize-y"
              />
              <p className="text-xs text-gray-600 mt-1 text-right">
                {formMessage.length.toLocaleString()} characters
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-3">
                Challenge Questions <span className="text-gray-600 font-normal">(5 required)</span>
              </h3>
              <div className="space-y-3">
                {formQuestions.map((q, i) => (
                  <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-gray-500 font-medium">Question {i + 1}</p>
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => {
                        const updated = [...formQuestions]
                        updated[i] = { ...updated[i], question: e.target.value }
                        setFormQuestions(updated)
                      }}
                      placeholder="Security question..."
                      className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={q.answer}
                      onChange={(e) => {
                        const updated = [...formQuestions]
                        updated[i] = { ...updated[i], answer: e.target.value }
                        setFormQuestions(updated)
                      }}
                      placeholder={editingPerson ? 'Leave blank to keep existing answer' : 'Answer...'}
                      className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
              >
                {saving ? 'Saving...' : editingPerson ? 'Save Changes' : 'Add Person'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <Modal title="Confirm Delete" onClose={() => setDeleteConfirm(null)}>
          <p className="text-sm text-gray-400 mb-6">
            Are you sure you want to delete this person? This will also remove all their challenge questions and cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteConfirm)}
              className="flex-1 bg-red-700 hover:bg-red-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  )
}
