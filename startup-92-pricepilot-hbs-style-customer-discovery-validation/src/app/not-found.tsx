import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Not Found — PricePilot',
  description: "The page you're looking for doesn't exist.",
}

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: '#f9fafb',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: '480px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🧭</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#111', margin: '0 0 0.75rem' }}>
          404 — Page Not Found
        </h1>
        <p style={{ color: '#555', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
          Let&apos;s get you back on track.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{
            background: '#0f172a', color: '#fff', padding: '0.65rem 1.5rem',
            borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem',
          }}>
            ← Back to Home
          </Link>
          <Link href="/calculator" style={{
            background: '#fff', color: '#0f172a', padding: '0.65rem 1.5rem',
            borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem',
            border: '1px solid #d1d5db',
          }}>
            Try the Calculator
          </Link>
          <Link href="/signup" style={{
            background: '#fff', color: '#0f172a', padding: '0.65rem 1.5rem',
            borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem',
            border: '1px solid #d1d5db',
          }}>
            Get Started Free
          </Link>
        </div>
      </div>
    </div>
  )
}
