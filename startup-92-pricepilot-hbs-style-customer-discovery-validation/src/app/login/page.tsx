'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectMessage = searchParams.get('message')
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) { setError('Invalid email or password'); return }
    router.push('/dashboard')
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" className="nav-logo" style={{ fontSize: '1.4rem' }}>🚀 PricingSim</Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '1rem' }}>Welcome back</h1>
        </div>

        <div className="card">
          <button className="btn btn-secondary" onClick={handleGoogle} data-testid="google-oauth-btn"
            style={{ width: '100%', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/></svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <hr style={{ flex: 1, borderColor: 'var(--border)' }} />
            <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>or email</span>
            <hr style={{ flex: 1, borderColor: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="label">Email</label>
              <input className="input" type="email" name="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="you@example.com" data-testid="email-input" />
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label className="label">Password</label>
              <input className="input" type="password" name="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="Your password" data-testid="password-input" />
            </div>
            <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
              <Link href="/reset-password" style={{ fontSize: '0.85rem', color: 'var(--brand)' }}>Forgot password?</Link>
            </div>
            {redirectMessage && (
              <p style={{ background: '#ede9fe', color: '#6c47ff', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', marginBottom: '0.5rem' }} data-testid="redirect-message">
                🔒 {redirectMessage}
              </p>
            )}
            {error && <p className="error-message" data-testid="auth-error">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={loading} data-testid="login-btn"
              style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
          Don&apos;t have an account? <Link href="/signup">Sign up free</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Loading…</div>}>
      <LoginForm />
    </Suspense>
  )
}
