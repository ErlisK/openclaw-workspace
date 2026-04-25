import Link from 'next/link'

export function DisclaimerBanner() {
  return (
    <div
      role="note"
      style={{
        background: '#fffbeb',
        border: '1px solid #fbbf24',
        borderRadius: '0.5rem',
        padding: '0.75rem 1rem',
        marginBottom: '1.5rem',
        fontSize: '0.875rem',
        color: '#92400e',
        lineHeight: 1.5,
      }}
    >
      ⚠️ <strong>Not financial advice.</strong> Suggestions are automated statistical estimates based on your sales data. Results vary; you are solely responsible for your pricing decisions.{' '}
      <Link href="/terms" style={{ color: '#92400e', textDecoration: 'underline' }}>
        Terms of Service
      </Link>
    </div>
  )
}
