import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Refund & Cancellation Policy' }

export default function RefundPolicyPage() {
  return (
    <div className="page">
      <nav className="nav">
        <div className="container nav-inner">
          <Link href="/" className="nav-logo">🚀 PricingSim</Link>
        </div>
      </nav>
      <main className="container" style={{ maxWidth: 720, paddingTop: '2rem', paddingBottom: '4rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Refund & Cancellation Policy</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>Last updated: June 2025</p>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Subscriptions</h2>
          <p>PricingSim Pro is billed monthly or annually. Subscriptions <strong>auto-renew</strong> at the end of each billing period. You will receive an email reminder before renewal.</p>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Cancellation</h2>
          <p>You may cancel your subscription at any time through the billing portal. Your access continues until the end of the paid period. No prorated refunds are issued for partial periods.</p>
          <p style={{ marginTop: '0.75rem' }}>
            <Link href="/billing" className="btn btn-secondary btn-sm">Open billing portal →</Link>
          </p>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>14-Day Refund Window</h2>
          <p>If you are unsatisfied within the first 14 days of your initial Pro subscription, contact us at <a href="mailto:hello@pricingsim.com" style={{ color: 'var(--brand)' }}>hello@pricingsim.com</a> for a full refund. Refund requests after 14 days are evaluated on a case-by-case basis.</p>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Contact</h2>
          <p>PricingSim / Lima Labs LLC<br />2298 Johanna Court, Pinole, CA 94564<br /><a href="mailto:hello@pricingsim.com" style={{ color: 'var(--brand)' }}>hello@pricingsim.com</a></p>
        </div>
      </main>
    </div>
  )
}
