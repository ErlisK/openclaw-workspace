import type { Metadata } from 'next'
import Link from 'next/link'
import ContactForm from '../components/ContactForm'

export const metadata: Metadata = {
  title: 'Contact Us — KidColoring',
  description: 'Get in touch with the KidColoring team. For support, general questions, or data/privacy requests.',
}

export default function ContactPage() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px 64px' }}>
      <div style={{ marginBottom: 32 }}>
        <Link href="/" style={{ color: '#7c3aed', textDecoration: 'none', fontSize: 14 }}>
          ← Back to KidColoring
        </Link>
      </div>

      <h1 style={{ fontSize: 38, fontWeight: 900, color: '#7c3aed', marginBottom: 8 }}>
        ✉️ Contact Us
      </h1>
      <p style={{ color: '#6b7280', marginBottom: 12, fontSize: 16, lineHeight: 1.7 }}>
        We&apos;d love to hear from you! Whether you have a question, need support, or want
        to request deletion of your data — we&apos;re here to help.
      </p>

      <div
        style={{
          background: '#f0fdf4',
          border: '2px solid #86efac',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 36,
          fontSize: 14,
          color: '#166534',
        }}
      >
        🔒 <strong>Privacy/Deletion Requests:</strong> Select &quot;Privacy/Deletion&quot; as the
        subject and we will honour your request within 30 days. See our{' '}
        <Link href="/privacy" style={{ color: '#166534' }}>
          Privacy Policy
        </Link>{' '}
        for details.
      </div>

      <ContactForm />
    </main>
  )
}
