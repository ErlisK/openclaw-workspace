import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Cookie Policy' }

export default function CookiesPage() {
  return (
    <div className="page">
      <nav className="nav">
        <div className="container nav-inner">
          <Link href="/" className="nav-logo">🚀 PricePilot</Link>
        </div>
      </nav>
      <main className="container" style={{ maxWidth: 720, paddingTop: '2rem', paddingBottom: '4rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Cookie Policy</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>Last updated: June 2025</p>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Essential Cookies</h2>
          <p>These cookies are required for the application to function. They enable authentication (Supabase session tokens) and security features. You cannot opt out of essential cookies while using PricePilot.</p>
          <ul style={{ marginTop: '0.75rem', paddingLeft: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
            <li><strong>sb-* (Supabase)</strong> — Authentication session tokens</li>
            <li><strong>pp_vid</strong> — Anonymous visitor ID for A/B experiment bucketing (HttpOnly, Secure, SameSite=Lax)</li>
          </ul>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Functional / Analytics Cookies</h2>
          <p>With your consent, we use analytics to understand how founders use PricePilot so we can improve the product. These are stored in localStorage and only activated when you click &quot;Accept all.&quot;</p>
          <ul style={{ marginTop: '0.75rem', paddingLeft: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
            <li><strong>pp_cookie_consent</strong> — Stores your cookie preference (localStorage)</li>
          </ul>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Managing Cookies</h2>
          <p>You can clear your cookie consent at any time by clearing your browser&apos;s localStorage or by visiting your browser settings. You may also configure your browser to block cookies entirely, though this will affect authentication.</p>
        </div>

        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          Questions? Email <a href="mailto:privacy@pricepilot.app" style={{ color: 'var(--brand)' }}>privacy@pricepilot.app</a>
        </p>
      </main>
    </div>
  )
}
