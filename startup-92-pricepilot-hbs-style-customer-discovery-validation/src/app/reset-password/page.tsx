'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const origin = window.location.origin
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password/update`,
    })
    setLoading(false)
    if (err) { setError('Failed to send reset email. Please check your email address.'); return }
    setSent(true)
  }

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" className="nav-logo" style={{ fontSize: '1.4rem' }}>🚀 PricingSim</Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '1rem' }}>Reset password</h1>
        </div>
        <div className="card">
          {sent ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📧</p>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Check your email</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                We sent a password reset link to <strong>{email}</strong>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Email address</label>
                <input className="input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  required placeholder="you@example.com" />
              </div>
              {error && <p className="error-message">{error}</p>}
              <button className="btn btn-primary" type="submit" disabled={loading}
                style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>
        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
          <Link href="/login">← Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
