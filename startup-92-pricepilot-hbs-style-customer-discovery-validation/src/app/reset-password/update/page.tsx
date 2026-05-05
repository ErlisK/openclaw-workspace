'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordUpdatePage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError('Failed to update password. Your reset link may have expired.'); return }
    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" className="nav-logo" style={{ fontSize: '1.4rem' }}>🚀 PricingSim</Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '1rem' }}>Set new password</h1>
        </div>
        <div className="card">
          {success ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✅</p>
              <p style={{ fontWeight: 600 }}>Password updated! Redirecting…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">New password</label>
                <input className="input" type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  required placeholder="At least 8 characters" minLength={8} />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="label">Confirm password</label>
                <input className="input" type="password" value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required placeholder="Repeat your password" />
              </div>
              {error && <p className="error-message">{error}</p>}
              <button className="btn btn-primary" type="submit" disabled={loading}
                style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? 'Saving…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
