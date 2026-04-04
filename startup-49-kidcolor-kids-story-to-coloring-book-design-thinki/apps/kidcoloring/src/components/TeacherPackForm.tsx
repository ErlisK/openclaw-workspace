'use client'

import { useState } from 'react'

export default function TeacherPackForm() {
  const [email,    setEmail]    = useState('')
  const [name,     setName]     = useState('')
  const [grade,    setGrade]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Email is required'); return }
    setLoading(true)
    setError('')

    try {
      const r = await fetch('/api/v1/teacher-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, grade, source: 'teachers_page' }),
      })
      const data = await r.json() as { error?: string; success?: boolean }
      if (!r.ok) throw new Error(data.error ?? 'Request failed')
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-6">
        <div className="text-5xl mb-4">📧</div>
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Check your inbox!</h3>
        <p className="text-gray-600 text-sm mb-4">
          We&apos;ve sent the free pack to <strong>{email}</strong>.
          Should arrive within a minute.
        </p>
        <div className="bg-violet-50 rounded-xl p-4 text-sm text-violet-700">
          <p className="font-semibold mb-1">While you wait...</p>
          <p>Let your students create personalised books at <strong>KidColoring.app</strong> — free to try!</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
      <div>
        <label htmlFor="teacher-email" className="block text-sm font-semibold text-gray-700 mb-1">
          School email *
        </label>
        <input
          id="teacher-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="teacher@school.edu"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          required
        />
      </div>
      <div>
        <label htmlFor="teacher-name" className="block text-sm font-semibold text-gray-700 mb-1">
          Your name (optional)
        </label>
        <input
          id="teacher-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ms. Johnson"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>
      <div>
        <label htmlFor="teacher-grade" className="block text-sm font-semibold text-gray-700 mb-1">
          Grade level (optional)
        </label>
        <select
          id="teacher-grade"
          value={grade}
          onChange={e => setGrade(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
        >
          <option value="">Select grade...</option>
          <option value="prek">Pre-K</option>
          <option value="k">Kindergarten</option>
          <option value="1">Grade 1</option>
          <option value="2">Grade 2</option>
          <option value="3">Grade 3</option>
          <option value="4">Grade 4</option>
          <option value="5">Grade 5</option>
          <option value="mixed">Mixed / Multiple grades</option>
          <option value="homeschool">Homeschool</option>
          <option value="other">Other</option>
        </select>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-violet-600 text-white font-extrabold py-4 rounded-2xl text-base hover:bg-violet-700 transition-colors disabled:opacity-50"
      >
        {loading ? '⏳ Sending…' : '📥 Get free pack instantly'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        No spam. Unsubscribe any time. Your email is never shared.
      </p>
    </form>
  )
}
