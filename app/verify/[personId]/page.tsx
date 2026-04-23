'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useParams } from 'next/navigation'

interface Question {
  id: string
  question_order: number
  question: string
}

type PageState = 'loading' | 'questions' | 'submitting' | 'success' | 'locked' | 'error'

export default function VerifyPage() {
  const params = useParams()
  const personId = params.personId as string

  const [pageState, setPageState] = useState<PageState>('loading')
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [remainingAttempts, setRemainingAttempts] = useState<number>(3)
  const [failureCount, setFailureCount] = useState(0)

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch(`/api/questions/${personId}`)
        if (!res.ok) {
          setPageState('error')
          setErrorMessage('Unable to load verification questions.')
          return
        }
        const data = await res.json()
        setQuestions(data.questions)
        setAnswers(new Array(data.questions.length).fill(''))
        setPageState('questions')
      } catch {
        setPageState('error')
        setErrorMessage('Failed to load questions. Please try again.')
      }
    }

    if (personId) {
      fetchQuestions()
    }
  }, [personId])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const unanswered = answers.some((a) => !a.trim())
    if (unanswered) {
      setErrorMessage('Please answer all questions.')
      return
    }

    setPageState('submitting')
    setErrorMessage(null)

    try {
      const res = await fetch('/api/verify-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId, answers }),
      })

      const data = await res.json()

      if (res.status === 429) {
        setPageState('locked')
        return
      }

      if (!res.ok) {
        const newFailureCount = failureCount + 1
        setFailureCount(newFailureCount)

        if (newFailureCount >= 3) {
          setPageState('locked')
          return
        }

        setRemainingAttempts(data.remainingAttempts ?? Math.max(0, 3 - newFailureCount))
        setErrorMessage(data.error ?? 'One or more answers are incorrect.')
        setPageState('questions')
        return
      }

      setPageState('success')
    } catch {
      setErrorMessage('Something went wrong. Please try again.')
      setPageState('questions')
    }
  }

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl text-center">
            <div className="w-12 h-12 bg-green-900/30 border border-green-800/50 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-gray-100 mb-3">Verification Submitted</h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              Verification submitted. You will receive an email within 24 hours.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (pageState === 'locked') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl text-center">
            <div className="w-12 h-12 bg-red-900/30 border border-red-800/50 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-gray-100 mb-3">Access Locked</h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              Too many failed attempts. Please wait 1 hour before trying again.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl text-center">
            <p className="text-sm text-red-400">{errorMessage ?? 'An error occurred.'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-800">
            <p className="text-sm text-gray-400">
              Please answer all {questions.length} security questions to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
            {questions.map((q, index) => (
              <div key={q.id}>
                <label
                  htmlFor={`answer-${index}`}
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  {q.question}
                </label>
                <input
                  id={`answer-${index}`}
                  type="text"
                  value={answers[index] ?? ''}
                  onChange={(e) => {
                    const newAnswers = [...answers]
                    newAnswers[index] = e.target.value
                    setAnswers(newAnswers)
                  }}
                  placeholder="Your answer"
                  autoComplete="off"
                  className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                  disabled={pageState === 'submitting'}
                />
              </div>
            ))}

            {errorMessage && (
              <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-3">
                <p>{errorMessage}</p>
                {remainingAttempts > 0 && failureCount > 0 && (
                  <p className="mt-1 text-red-500/70">
                    {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={pageState === 'submitting'}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium rounded-lg px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              {pageState === 'submitting' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit Answers'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
