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
      <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/privacy" style={{ color: 'var(--muted, #6b7280)', textDecoration: 'none' }}>
          Privacy Policy
        </Link>
        <Link href="/terms" style={{ color: 'var(--muted, #6b7280)', textDecoration: 'none' }}>
          Terms of Service
        </Link>
        <span>© {new Date().getFullYear()} PricePilot</span>
      </div>
    </footer>
  )
}
