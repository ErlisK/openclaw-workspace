import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CSV Import Guide — PricePilot',
  description: 'How to import transaction data via CSV into PricePilot.',
}

const platforms = [
  {
    name: 'Stripe',
    file: 'stripe-charges-template.csv',
    cols: [
      ['id', 'Transaction / charge ID'],
      ['amount', 'Amount in major currency units (e.g. 29.00)'],
      ['currency', 'ISO currency code (e.g. usd)'],
      ['created', 'ISO timestamp or date string'],
      ['description', 'Product or service description'],
      ['customer_email', 'Customer email address'],
    ],
  },
  {
    name: 'Gumroad',
    file: 'gumroad-sales-template.csv',
    cols: [
      ['purchased_at', 'Purchase date/time'],
      ['price', 'Sale price (e.g. 19.00)'],
      ['product_name', 'Name of the product sold'],
      ['purchaser_email', 'Buyer email address'],
    ],
  },
  {
    name: 'Shopify',
    file: 'shopify-orders-template.csv',
    cols: [
      ['Name', 'Order number (e.g. #1001)'],
      ['Lineitem name', 'Product / line item title'],
      ['Total', 'Order total'],
      ['Email', 'Customer email'],
      ['Created at', 'Order creation timestamp'],
      ['Currency', 'Currency code'],
      ['Financial Status', 'paid / refunded / etc.'],
    ],
  },
]

export default function CsvImportPage() {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 1rem' }}>
      <div style={{ marginBottom: '0.5rem' }}>
        <Link href="/docs" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.9rem' }}>← Docs</Link>
      </div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>CSV Import Guide</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Import your transaction history from Stripe, Gumroad, or Shopify using a CSV export.
        Download a sample template below to see the exact format required.
      </p>

      {platforms.map(platform => (
        <section key={platform.name} style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>{platform.name} CSV</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb' }}>Column</th>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {platform.cols.map(([col, desc]) => (
                <tr key={col}>
                  <td style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', fontFamily: 'monospace' }}>{col}</td>
                  <td style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', color: '#6b7280' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <a
            href={`/templates/${platform.file}`}
            download
            style={{ color: '#6c47ff', textDecoration: 'underline', fontSize: '0.9rem' }}
          >
            ⬇ Download {platform.name} template
          </a>
        </section>
      ))}

      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '1rem', fontSize: '0.9rem', color: '#166534' }}>
        💡 <strong>Tip:</strong> After importing, head to{' '}
        <Link href="/suggestions" style={{ color: '#15803d' }}>Suggestions</Link>{' '}
        and run the analysis engine to get your first price recommendations.
      </div>
    </main>
  )
}
