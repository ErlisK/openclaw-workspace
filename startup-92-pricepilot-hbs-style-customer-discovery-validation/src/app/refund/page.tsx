import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Refund Policy — PricingSim',
}

export default function RefundPage() {
  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: '3rem 1rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.9rem' }}>← PricingSim</Link>
      </div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>Refund Policy</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.9rem' }}>Last updated: January 2025</p>
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Annual Plans</h2>
        <p style={{ color: '#374151', lineHeight: 1.6 }}>
          Annual plan subscribers may request a full refund within 30 days of purchase. After 30 days, refunds are issued on a pro-rata basis for unused months at our discretion.
        </p>
      </section>
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Monthly Plans</h2>
        <p style={{ color: '#374151', lineHeight: 1.6 }}>
          Monthly subscriptions are non-refundable except where required by applicable law. You may cancel at any time and retain access through the end of your billing period.
        </p>
      </section>
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>How to Request a Refund</h2>
        <p style={{ color: '#374151', lineHeight: 1.6 }}>
          Email <a href="mailto:hello@pricingsim.com" style={{ color: '#6c47ff' }}>hello@pricingsim.com</a> with your account email and order details. We aim to respond within 2 business days.
        </p>
      </section>
      <section>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Consumer Rights</h2>
        <p style={{ color: '#374151', lineHeight: 1.6 }}>
          Nothing in this policy limits any statutory rights you may have under applicable consumer protection laws in your jurisdiction.
        </p>
      </section>
    </main>
  )
}
