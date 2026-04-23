'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import AdminLayout from '@/components/AdminLayout'

interface Person {
  id: string
  name: string
  email: string
  access_tier: 'FULL' | 'PERSONAL'
  is_activated: number
  personal_email_message: string | null
  video_url: string | null
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

  // Video modal state
  const [videoModal, setVideoModal] = useState<Person | null>(null)
  const [videoUploading, setVideoUploading] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [videoSuccess, setVideoSuccess] = useState(false)
  const [videoDeleting, setVideoDeleting] = useState(false)
  const videoFileRef = useRef<HTMLInputElement>(null)

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

  function openVideoModal(person: Person) {
    setVideoModal(person)
    setVideoProgress(0)
    setVideoError(null)
    setVideoSuccess(false)
    setVideoUploading(false)
    setVideoDeleting(false)
  }

  async function handleVideoUpload(file: File) {
    if (!videoModal) return
    setVideoUploading(true)
    setVideoProgress(0)
    setVideoError(null)
    setVideoSuccess(false)

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('file', file)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setVideoProgress(Math.round((e.loaded / e.total) * 100))
        }
      }

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setVideoSuccess(true)
          setVideoUploading(false)
          // Refresh people list so video_url is updated
          await loadPeople()
          // Update videoModal person object
          const res = await fetch('/api/admin/people')
          if (res.ok) {
            const data = await res.json()
            const updated = data.people.find((p: Person) => p.id === videoModal.id)
            if (updated) setVideoModal(updated)
          }
          resolve()
        } else {
          let errMsg = 'Upload failed'
          try {
            const d = JSON.parse(xhr.responseText)
            errMsg = d.error ?? errMsg
          } catch {}
          setVideoError(errMsg)
          setVideoUploading(false)
          reject(new Error(errMsg))
        }
      }

      xhr.onerror = () => {
        setVideoError('Upload failed — network error')
        setVideoUploading(false)
        reject(new Error('Network error'))
      }

      xhr.open('POST', `/api/admin/people/${videoModal.id}/video`)
      xhr.send(formData)
    })
  }

  async function handleVideoDelete() {
    if (!videoModal) return
    setVideoDeleting(true)
    setVideoError(null)
    try {
      const res = await fetch(`/api/admin/people/${videoModal.id}/video`, { method: 'DELETE' })
      if (res.ok) {
        await loadPeople()
        setVideoModal((prev) => (prev ? { ...prev, video_url: null } : null))
        setVideoSuccess(false)
      } else {
        const d = await res.json()
        setVideoError(d.error ?? 'Delete failed')
      }
    } catch {
      setVideoError('Delete failed')
    } finally {
      setVideoDeleting(false)
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    // Only include questions in payload if at least one has BOTH question text AND a new answer
    // This prevents wiping existing challenge questions when just editing the letter
    const questionsWithContent = formQuestions.filter((q) => q.question.trim() && q.answer.trim())
    const payload: Record<string, unknown> = {
      name: formName,
      email: formEmail,
      access_tier: formTier,
      personal_email_message: formMessage || null,
    }
    if (questionsWithContent.length > 0) {
      payload.questions = questionsWithContent
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

  // Current video filename from R2 key
  const videoFilename = videoModal?.video_url?.split('/').pop() ?? null

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
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Video</th>
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
                    <td className="px-6 py-4">
                      {person.video_url ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-400">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          Uploaded
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openVideoModal(person)}
                          className="text-xs text-purple-400 hover:text-purple-300 px-2.5 py-1 rounded-md hover:bg-purple-950/30 transition-colors"
                        >
                          Video
                        </button>
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

      {/* Video Upload Modal */}
      {videoModal && (
        <Modal
          title={`Video Message — ${videoModal.name}`}
          onClose={() => setVideoModal(null)}
        >
          <div className="space-y-5">
            {/* Current video preview */}
            {(videoModal.video_url || videoSuccess) && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-400">Current Video</p>
                <div className="bg-black rounded-lg overflow-hidden">
                  <video
                    key={videoModal.video_url}
                    controls
                    className="w-full max-h-56"
                    src={`/api/vault/video/${videoModal.id}`}
                    preload="metadata"
                  >
                    Video preview not available.
                  </video>
                </div>
                {videoFilename && (
                  <p className="text-xs text-gray-500">
                    File: <span className="text-gray-400 font-mono">{videoFilename}</span>
                  </p>
                )}
                <button
                  onClick={handleVideoDelete}
                  disabled={videoDeleting}
                  className="text-xs text-red-500 hover:text-red-400 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  {videoDeleting ? (
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                  {videoDeleting ? 'Removing...' : 'Remove Video'}
                </button>
              </div>
            )}

            {/* Upload zone */}
            <div>
              <p className="text-xs font-medium text-gray-400 mb-2">
                {videoModal.video_url ? 'Replace Video' : 'Upload Video'}
              </p>
              <p className="text-xs text-gray-600 mb-3">
                Accepted: .mp4, .mov, .webm — Max 500MB
              </p>

              {/* Hidden file input */}
              <input
                ref={videoFileRef}
                type="file"
                accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleVideoUpload(file)
                  e.target.value = ''
                }}
              />

              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                  ${videoUploading
                    ? 'border-indigo-700 bg-indigo-950/20 cursor-not-allowed'
                    : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/30'
                  }`}
                onClick={() => !videoUploading && videoFileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault() }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (videoUploading) return
                  const file = e.dataTransfer.files?.[0]
                  if (file) handleVideoUpload(file)
                }}
              >
                <svg className="w-8 h-8 text-gray-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.362a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-400">
                  {videoUploading ? 'Uploading...' : 'Drop video here or click to browse'}
                </p>
              </div>

              {/* Progress bar */}
              {videoUploading && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Uploading...</span>
                    <span>{videoProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${videoProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {videoSuccess && !videoUploading && (
                <p className="mt-3 text-xs text-green-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Video uploaded successfully
                </p>
              )}
            </div>

            {videoError && (
              <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-3">
                {videoError}
              </p>
            )}

            <div className="pt-2">
              <button
                onClick={() => setVideoModal(null)}
                className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

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
