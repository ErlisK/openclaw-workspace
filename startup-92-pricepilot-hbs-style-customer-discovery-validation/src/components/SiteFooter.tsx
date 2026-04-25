import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border, #e5e7eb)',
        padding: '1.5rem',
        textAlign: 'center',
        color: 'var(--muted, #6b7280)',
        fontSize: '0.8rem',
        marginTop: '4rem',
      }}
    >
      <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <Link href="/privacy" style={{ color: 'var(--muted, #6b7280)', textDecoration: 'none' }}>Privacy Policy</Link>
        <Link href="/terms" style={{ color: 'var(--muted, #6b7280)', textDecoration: 'none' }}>Terms of Service</Link>
        <Link href="/cookies" style={{ color: 'var(--muted, #6b7280)', textDecoration: 'none' }}>Cookies</Link>
        <Link href="/refund-policy" style={{ color: 'var(--muted, #6b7280)', textDecoration: 'none' }}>Refund Policy</Link>
        <Link href="/billing" style={{ color: 'var(--muted, #6b7280)', textDecoration: 'none' }}>Billing</Link>
        <a href="mailto:support@pricepilot.io" style={{ color: 'var(--muted, #6b7280)', textDecoration: 'none' }}>support@pricepilot.io</a>
      </div>
      <p style={{ margin: 0 }}>© {new Date().getFullYear()} PricePilot / Lima Labs LLC · 2298 Johanna Court, Pinole, CA 94564</p>
    </footer>
  )
}
