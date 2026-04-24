import Link from 'next/link'

const PLATFORMS = [
  {
    id: 'gumroad',
    name: 'Gumroad',
    icon: '🌸',
    color: '#ff90e8',
    exportPath: 'Analytics → Sales → Export CSV',
    exportUrl: 'https://app.gumroad.com/analytics',
    templateFile: 'gumroad-sales-template.csv',
    columns: [
      { name: 'Sale Date', required: true, maps_to: 'purchased_at', example: '2024-01-15', notes: 'When the sale happened' },
      { name: 'Product Name', required: true, maps_to: 'product_name', example: 'Landing Page Template', notes: 'Your product title' },
      { name: 'Price', required: true, maps_to: 'amount', example: '29', notes: 'Sale price (before fees)' },
      { name: 'Net Total', required: false, maps_to: 'amount (fallback)', example: '26.68', notes: 'Used if Price is missing' },
      { name: 'Email', required: false, maps_to: 'customer_key', example: 'buyer@example.com', notes: 'Buyer email for cohort analysis' },
      { name: 'Currency', required: false, maps_to: 'currency', example: 'USD', notes: 'Defaults to USD' },
      { name: 'Refunded', required: false, maps_to: 'is_refunded', example: 'true / false', notes: 'Used to mark refunded sales' },
    ],
    tips: [
      'Go to app.gumroad.com → Analytics → Sales',
      'Set date range (export up to 1 year at a time for large stores)',
      'Click "Export CSV" — file downloads immediately',
      'Upload using the Import page — all columns auto-detected',
    ],
    commonErrors: [
      { error: 'Missing "Sale Date" column', fix: 'Ensure you exported from the Sales tab, not Dashboard summary' },
      { error: 'Price = 0 rows skipped', fix: 'Memberships and "pay what you want" sales may show $0 — set a minimum price' },
      { error: 'Encoding issues', fix: 'Save as UTF-8 CSV if you see garbled characters in product names' },
    ],
  },
  {
    id: 'shopify',
    name: 'Shopify',
    icon: '🛍️',
    color: '#96bf48',
    exportPath: 'Orders → Export → All orders (CSV)',
    exportUrl: 'https://admin.shopify.com/orders',
    templateFile: 'shopify-orders-template.csv',
    columns: [
      { name: 'Name', required: true, maps_to: 'platform_txn_id', example: '#1001', notes: 'Shopify order number — used as unique ID' },
      { name: 'Total', required: true, maps_to: 'amount', example: '49.00', notes: 'Order total including taxes/shipping' },
      { name: 'Email', required: false, maps_to: 'customer_key', example: 'buyer@example.com', notes: 'Customer email' },
      { name: 'Financial Status', required: false, maps_to: 'is_refunded', example: 'paid / refunded', notes: '"refunded" marks the row as refunded' },
      { name: 'Currency', required: false, maps_to: 'currency', example: 'USD', notes: 'Defaults to USD' },
      { name: 'Created at', required: false, maps_to: 'purchased_at', example: '2024-01-15 12:00:00 +0000', notes: 'Order date/time' },
      { name: 'Lineitem name', required: false, maps_to: 'product_name', example: 'Analytics Dashboard Pro', notes: 'First line item product name' },
      { name: 'Subtotal', required: false, maps_to: 'amount (fallback)', example: '45.00', notes: 'Used if Total is missing' },
    ],
    tips: [
      'Go to Shopify Admin → Orders → click "Export"',
      'Choose "All orders" + "CSV for Excel, Numbers, or other spreadsheet programs"',
      'For large stores: filter by date range first, then export',
      'Each CSV row = one line item; duplicate order IDs are deduplicated automatically',
    ],
    commonErrors: [
      { error: '"Name" column missing', fix: 'Ensure you chose the standard Orders export, not the "Plain CSV" variant' },
      { error: 'Duplicate rows imported as one', fix: 'Expected — orders with multiple line items are counted once (by order #Name)' },
      { error: 'Total = 0 for some orders', fix: 'Draft/pending orders may have $0 totals — filter to "paid" status before exporting' },
    ],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    icon: '⚡',
    color: '#635bff',
    exportPath: 'Payments → Export → Charges (CSV)',
    exportUrl: 'https://dashboard.stripe.com/payments',
    templateFile: 'stripe-charges-template.csv',
    columns: [
      { name: 'id', required: true, maps_to: 'platform_txn_id', example: 'ch_1ABC...', notes: 'Charge ID — unique identifier' },
      { name: 'Amount', required: true, maps_to: 'amount', example: '29.00', notes: 'Charge amount in your account currency' },
      { name: 'Customer Email', required: false, maps_to: 'customer_key', example: 'buyer@example.com', notes: 'Buyer email' },
      { name: 'Currency', required: false, maps_to: 'currency', example: 'usd', notes: 'Lowercase 3-letter currency code' },
      { name: 'Status', required: false, maps_to: 'is_refunded', example: 'Paid / Refunded', notes: '"Refunded" marks the row as refunded' },
      { name: 'Description', required: false, maps_to: 'product_name (fallback)', example: 'My Course purchase', notes: 'Used if Metadata: product_name is empty' },
      { name: 'Created (UTC)', required: false, maps_to: 'purchased_at', example: '2024-01-15 12:00', notes: 'Charge timestamp' },
      { name: 'Metadata: product_name', required: false, maps_to: 'product_name', example: 'SEO Email Pack', notes: 'If you tag charges with product names in Stripe' },
    ],
    tips: [
      'Stripe Dashboard → Payments → click "Export" (top right)',
      'Alternatively: connect your Stripe key on the Connections page for automatic import',
      'CSV export is useful for historical data or accounts with many charges',
      '"Amount Refunded" > 0 = partially refunded; "Status" = Refunded = fully refunded',
    ],
    commonErrors: [
      { error: '"Amount" column is empty', fix: 'Ensure you exported "Charges" not "Balance transactions" — they have different schemas' },
      { error: 'Charges with $0', fix: 'Free trials or uncaptured PaymentIntents show $0 — they are skipped automatically' },
      { error: 'Wrong date format', fix: 'Stripe exports UTC timestamps — they import correctly as-is' },
    ],
  },
]

export default function ImportGuidePage() {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#fafafa', minHeight: '100vh' }}>
      <nav style={{ borderBottom: '1px solid #e5e7eb', background: '#fff', padding: '0 1.5rem' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/import" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>← Import</Link>
          <span style={{ color: '#d1d5db' }}>|</span>
          <span style={{ fontWeight: 700 }}>CSV Import Guide</span>
        </div>
      </nav>

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>📄 CSV Import Guide</h1>
          <p style={{ color: '#6b7280', fontSize: '1rem', maxWidth: 600 }}>
            Detailed column mappings, export instructions, and troubleshooting for each supported platform.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {PLATFORMS.map(p => (
              <a key={p.id} href={`#${p.id}`} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '2rem', padding: '0.35rem 0.9rem', textDecoration: 'none', color: '#374151', fontSize: '0.875rem', fontWeight: 600 }}>
                {p.icon} {p.name}
              </a>
            ))}
            <Link href="/import" style={{ background: '#6c47ff', color: '#fff', borderRadius: '2rem', padding: '0.35rem 0.9rem', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
              ↑ Go import now →
            </Link>
          </div>
        </div>

        {PLATFORMS.map(platform => (
          <section key={platform.id} id={platform.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '1rem', padding: '2rem', marginBottom: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2rem' }}>{platform.icon}</span>
              <div>
                <h2 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.2rem' }}>{platform.name}</h2>
                <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Export path: <code style={{ background: '#f3f4f6', padding: '0.1rem 0.3rem', borderRadius: 4 }}>{platform.exportPath}</code></p>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                <a href={`/templates/${platform.templateFile}`} download
                  style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.4rem 0.75rem', textDecoration: 'none', color: '#374151', fontSize: '0.8rem', fontWeight: 600 }}>
                  ↓ Template CSV
                </a>
              </div>
            </div>

            {/* Column mapping table */}
            <h3 style={{ fontWeight: 700, fontSize: '0.875rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Column Mappings</h3>
            <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['CSV Column', 'Required', 'Maps To', 'Example', 'Notes'].map(h => (
                      <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {platform.columns.map((col, idx) => (
                    <tr key={col.name} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontWeight: 600, borderBottom: '1px solid #f3f4f6' }}>{col.name}</td>
                      <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f3f4f6' }}>
                        {col.required
                          ? <span style={{ color: '#dc2626', fontWeight: 700 }}>✓ Required</span>
                          : <span style={{ color: '#9ca3af' }}>Optional</span>}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', color: '#6c47ff', borderBottom: '1px solid #f3f4f6' }}>{col.maps_to}</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}><code style={{ background: '#f3f4f6', padding: '0.1rem 0.3rem', borderRadius: 4, fontSize: '0.8rem' }}>{col.example}</code></td>
                      <td style={{ padding: '0.5rem 0.75rem', color: '#9ca3af', borderBottom: '1px solid #f3f4f6' }}>{col.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {/* How to export */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.75rem', padding: '1rem' }}>
                <h4 style={{ fontWeight: 700, color: '#065f46', marginBottom: '0.5rem', fontSize: '0.875rem' }}>✅ How to export from {platform.name}</h4>
                <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {platform.tips.map(t => <li key={t} style={{ fontSize: '0.8rem', color: '#374151' }}>{t}</li>)}
                </ol>
              </div>

              {/* Common errors */}
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.75rem', padding: '1rem' }}>
                <h4 style={{ fontWeight: 700, color: '#991b1b', marginBottom: '0.5rem', fontSize: '0.875rem' }}>🔧 Common errors &amp; fixes</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {platform.commonErrors.map(e => (
                    <div key={e.error}>
                      <p style={{ fontWeight: 600, fontSize: '0.8rem', color: '#dc2626', marginBottom: '0.15rem' }}>{e.error}</p>
                      <p style={{ fontSize: '0.78rem', color: '#6b7280' }}>→ {e.fix}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}

        {/* Validate before import CTA */}
        <div style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: '1px solid #c4b5fd', borderRadius: '1rem', padding: '1.5rem', textAlign: 'center' }}>
          <h2 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Validate before importing</h2>
          <p style={{ color: '#7c3aed', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            Use the import page to preview your CSV — it validates column structure and shows a 3-row preview before committing.
          </p>
          <Link href="/import" style={{ background: '#6c47ff', color: '#fff', padding: '0.75rem 2rem', borderRadius: '0.75rem', textDecoration: 'none', fontWeight: 700 }}>
            Go to Import → Validate & Import
          </Link>
        </div>
      </div>
    </div>
  )
}
