'use client'

import { useState, FormEvent } from 'react'

const SUBJECTS = ['General', 'Support', 'Privacy/Deletion']

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '2px solid #e5e7eb',
  borderRadius: 12,
  padding: '12px 16px',
  fontSize: 15,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 6,
}

export default function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSubmit = emailValid && subject !== '' && message.trim().length >= 10 && !loading

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          subject,
          message: message.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429) throw new Error('Too many requests. Please wait a moment and try again.')
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: '#f5f3ff',
          borderRadius: 24,
        }}
      >
        <span style={{ fontSize: 64, display: 'block', marginBottom: 16 }}>🎉</span>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#7c3aed', marginBottom: 8 }}>
          Message Sent!
        </h2>
        <p style={{ color: '#6b7280', lineHeight: 1.6 }}>
          Thanks for reaching out. We&apos;ll get back to you as soon as possible —
          usually within 1–2 business days.
        </p>
        {subject === 'Privacy/Deletion' && (
          <p
            style={{
              marginTop: 16,
              fontSize: 14,
              color: '#5b21b6',
              background: '#ede9fe',
              borderRadius: 10,
              padding: '10px 16px',
              display: 'inline-block',
            }}
          >
            🔒 Your privacy/deletion request has been received and will be processed within 30 days.
          </p>
        )}
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
      noValidate
    >
      <div>
        <label style={labelStyle} htmlFor="contact-name">
          Your Name <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
        </label>
        <input
          id="contact-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith"
          style={inputStyle}
          maxLength={100}
        />
      </div>

      <div>
        <label style={labelStyle} htmlFor="contact-email">
          Email Address <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <input
          id="contact-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="parent@example.com"
          style={{
            ...inputStyle,
            borderColor: email && !emailValid ? '#dc2626' : '#e5e7eb',
          }}
          maxLength={254}
        />
        {email && !emailValid && (
          <p style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>
            Please enter a valid email address.
          </p>
        )}
      </div>

      <div>
        <label style={labelStyle} htmlFor="contact-subject">
          Subject <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <select
          id="contact-subject"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={{
            ...inputStyle,
            background: 'white',
            cursor: 'pointer',
          }}
        >
          <option value="">Select a subject…</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle} htmlFor="contact-message">
          Message <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <textarea
          id="contact-message"
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us how we can help…"
          rows={5}
          style={{
            ...inputStyle,
            resize: 'vertical',
            minHeight: 120,
          }}
          maxLength={2000}
        />
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
          {message.length}/2000 characters
        </p>
      </div>

      {error && (
        <p
          style={{
            color: '#dc2626',
            fontSize: 14,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '10px 14px',
          }}
        >
          ⚠️ {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          background: canSubmit ? '#7c3aed' : '#d1d5db',
          color: canSubmit ? 'white' : '#9ca3af',
          fontWeight: 800,
          fontSize: 17,
          padding: '16px',
          borderRadius: 14,
          border: 'none',
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit',
          transition: 'background 0.15s',
        }}
      >
        {loading ? '⏳ Sending…' : '✉️ Send Message'}
      </button>

      <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
        We typically respond within 1–2 business days.
      </p>
    </form>
  )
}
