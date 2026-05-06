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

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" className="nav-logo" style={{ fontSize: '1.4rem' }}>🚀 PricingSim</Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '1rem' }}>Welcome back</h1>
        </div>

        <div className="card">
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

function LoginFallback() {
  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" className="nav-logo" style={{ fontSize: '1.4rem' }}>🚀 PricingSim</Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '1rem' }}>Welcome back</h1>
        </div>
        <div className="card">
          <div style={{ marginBottom: '1rem' }}>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="Your password" />
          </div>
          <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
            <Link href="/reset-password" style={{ fontSize: '0.85rem', color: 'var(--brand)' }}>Forgot password?</Link>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>Sign in</button>
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
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}
