'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { SiteFooter } from '@/components/SiteFooter'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (!termsAccepted) { setError('You must accept the Terms of Service to continue'); return }
    setLoading(true)
    const { data, error: err } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (err) {
      const msg = err.message
      setError(msg)
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('user already exists')) {
        setIsAlreadyRegistered(true)
      }
      return
    }
    if (data.session) {
      // Conversion tracking
      if (typeof window !== 'undefined') {
        if ((window as any).rdt) (window as any).rdt('track', 'SignUp');
        if (typeof (window as any).gtag === 'function') {
          (window as any).gtag('event', 'conversion', { send_to: 'AW-PLACEHOLDER/PLACEHOLDER_LABEL', value: 1.0, currency: 'USD' });
        }
      }
      router.push('/import')
    } else {
      setEmailSent(true)
    }
  }

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" className="nav-logo" style={{ fontSize: '1.4rem' }}>🚀 PricingSim</Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '1rem' }}>Create your account</h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>Free forever · No credit card</p>
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
            <p style={{ color: '#1e40af', fontSize: '0.75rem', background: '#eff6ff', borderRadius: 6, padding: '0.25rem 0.75rem', display: 'inline-block', margin: 0 }}>Works with 30+ transactions · most sellers qualify on day 1</p>
            <p style={{ color: '#166534', fontSize: '0.75rem', background: '#dcfce7', borderRadius: 6, padding: '0.25rem 0.75rem', display: 'inline-block', margin: 0, fontWeight: 600 }}>🚀 57 founders already running price experiments</p>
          </div>
        </div>

        {emailSent ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }} data-testid="email-confirmation-banner">
            <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>📧</p>
            <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Check your email</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
              We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.
            </p>
            <Link href="/login" className="btn btn-secondary">Back to login</Link>
          </div>
        ) : (
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="label">Email</label>
              <input className="input" type="email" name="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="you@example.com" data-testid="email-input" />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label">Password</label>
              <input className="input" type="password" name="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="Min. 8 characters" data-testid="password-input" />
            </div>
            {error && (
              <div data-testid="auth-error">
                <p className="error-message">{error}</p>
                {isAlreadyRegistered && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    <Link href={`/login?email=${encodeURIComponent(email)}`} className="btn btn-secondary btn-sm" style={{ display: 'inline-block' }}>
                      Sign in with this email →
                    </Link>
                  </p>
                )}
              </div>
            )}
            <div style={{ marginBottom: '1rem', marginTop: '0.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--muted)' }}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  data-testid="terms-checkbox"
                  style={{ marginTop: '0.15rem', flexShrink: 0 }}
                />
                <span>I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)' }}>Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)' }}>Privacy Policy</a></span>
              </label>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} data-testid="signup-btn"
              style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
      <SiteFooter />
    </div>
  )
}
