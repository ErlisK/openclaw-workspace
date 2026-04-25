import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documentation — PricePilot',
  description: 'Guides and reference for PricePilot — pricing experiments, connectors, and the Bayesian engine.',
}

const docPages = [
  { slug: 'quickstart', title: 'Quickstart Guide', description: 'Get from zero to your first pricing experiment in under 10 minutes.', icon: '🚀' },
  { slug: 'csv-import', title: 'CSV Import Guide', description: 'Import Stripe, Gumroad, or Shopify transactions via CSV. Required headers and downloadable templates.', icon: '📥' },
]

export default function DocsPage() {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 1rem' }}>
      <div style={{ marginBottom: '0.5rem' }}>
        <Link href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.9rem' }}>← PricePilot</Link>
      </div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Documentation</h1>
      <p style={{ color: '#6b7280', marginBottom: '2.5rem' }}>
        Everything you need to get started and make the most of PricePilot.
      </p>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {docPages.map(doc => (
          <Link
            key={doc.slug}
            href={`/docs/${doc.slug}`}
            data-testid={`docs-page-${doc.slug}`}
            style={{
              border: '1px solid #e5e7eb', borderRadius: 12,
              padding: '1.25rem', background: '#fff', textDecoration: 'none', color: 'inherit',
              display: 'block', transition: 'border-color 0.2s',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{doc.icon}</div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem' }}>{doc.title}</h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>{doc.description}</p>
          </Link>
        ))}

        {/* CSV Import Guide is available at /docs/csv-import */}
      </div>

      <div style={{ marginTop: '2.5rem', padding: '1.25rem', background: '#f9fafb', borderRadius: 10, fontSize: '0.9rem' }}>
        <strong>Need help?</strong> Reach us at{' '}
        <a href="mailto:support@pricepilot.ai" style={{ color: 'var(--brand, #4f46e5)' }}>support@pricepilot.ai</a>
        {' '}or join the community on{' '}
        <a href="https://discord.gg/pricepilot" style={{ color: 'var(--brand, #4f46e5)' }}>Discord</a>.
      </div>
    </main>
  )
}
