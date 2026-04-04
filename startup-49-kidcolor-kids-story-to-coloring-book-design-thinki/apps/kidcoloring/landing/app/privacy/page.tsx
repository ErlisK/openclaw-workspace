import type { Metadata } from 'next'
import Link from 'next/link'
import PolicyViewTracker from '../components/PolicyViewTracker'

export const metadata: Metadata = {
  title: 'Privacy Policy — KidColoring',
  description: 'How KidColoring collects, uses, and protects your information. Kid-safe and parent-friendly.',
}

export default function PrivacyPage() {
  return (
    <>
      <PolicyViewTracker pageName="privacy" path="/privacy" />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 64px' }}>
        <div style={{ marginBottom: 32 }}>
          <Link href="/" style={{ color: '#7c3aed', textDecoration: 'none', fontSize: 14 }}>
            ← Back to KidColoring
          </Link>
        </div>

        <h1 style={{ fontSize: 38, fontWeight: 900, color: '#7c3aed', marginBottom: 8 }}>
          🔒 Privacy Policy
        </h1>
        <p style={{ color: '#6b7280', marginBottom: 40, fontSize: 15 }}>
          <strong>Effective Date:</strong> June 1, 2026
        </p>

        <div style={{ lineHeight: 1.8, color: '#374151' }}>
          <p>
            At <strong>KidColoring</strong>, we believe in keeping things simple, honest, and safe —
            especially when it comes to kids. This Privacy Policy explains what information we collect,
            how we use it, and the choices you have. It is written in plain language so parents and
            guardians can understand it easily.
          </p>

          <p
            style={{
              background: '#fef3c7',
              border: '2px solid #f59e0b',
              borderRadius: 12,
              padding: '16px 20px',
              fontSize: 14,
              margin: '24px 0',
            }}
          >
            ⚠️ <strong>Not Legal Advice:</strong> This policy is provided for informational purposes
            only and does not constitute legal advice. If you have specific legal concerns, please
            consult a qualified attorney.
          </p>

          <Section title="1. What We Collect">
            <p>We collect only what we need to run KidColoring:</p>
            <ul>
              <li>
                <strong>Email address</strong> — when you join our waitlist or contact us, so we can
                send you updates and respond to your inquiries.
              </li>
              <li>
                <strong>Name (optional)</strong> — your first name if you choose to share it, so we
                can greet you personally.
              </li>
              <li>
                <strong>Child&apos;s age range (optional)</strong> — a broad age bracket (e.g., 5–7
                years) to help us tailor content appropriately.
              </li>
              <li>
                <strong>Interests (optional)</strong> — topics your child enjoys (e.g., &quot;dinosaurs,
                space&quot;) to personalise the experience.
              </li>
              <li>
                <strong>Basic usage events</strong> — anonymous signals like page visits and button
                clicks, used to improve the product. These do not include names, emails, or any
                identifying information.
              </li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Data">
            <p>We use the information we collect to:</p>
            <ul>
              <li>Send waitlist updates and launch announcements to parents/guardians who opted in.</li>
              <li>Respond to contact form inquiries and support requests.</li>
              <li>Improve our product based on aggregate, anonymised usage patterns.</li>
              <li>Honour deletion and data-access requests (see &quot;Your Rights&quot; below).</li>
            </ul>
            <p>
              <strong>We do not sell your data.</strong> We do not share your personal information with
              third-party advertisers or data brokers.
            </p>
          </Section>

          <Section title="3. Children's Privacy">
            <p>
              KidColoring is designed for parents and guardians to use on behalf of their children.{' '}
              <strong>We do not knowingly collect personal information directly from children.</strong>
            </p>
            <ul>
              <li>
                All sign-ups are intended for parents or guardians aged 18 or older.
              </li>
              <li>
                We do not ask children to create accounts, submit forms, or provide any personal
                information independently.
              </li>
              <li>
                If you believe a child under 13 has submitted personal information to us without
                parental consent, please{' '}
                <Link href="/contact" style={{ color: '#7c3aed' }}>
                  contact us
                </Link>{' '}
                immediately and we will delete it promptly.
              </li>
            </ul>
          </Section>

          <Section title="4. Data Retention">
            <p>
              We retain waitlist email addresses until you ask us to delete them, or until KidColoring
              launches and we no longer need the waitlist. Usage event data is stored in aggregate and
              is not tied to identifiable individuals after 90 days.
            </p>
          </Section>

          <Section title="5. Your Rights">
            <p>You have the right to:</p>
            <ul>
              <li>
                <strong>Access:</strong> Request a copy of the personal data we hold about you.
              </li>
              <li>
                <strong>Deletion:</strong> Ask us to delete your data at any time (including any data
                associated with your email address on the waitlist).
              </li>
              <li>
                <strong>Correction:</strong> Ask us to correct inaccurate information.
              </li>
              <li>
                <strong>Opt-out:</strong> Unsubscribe from our emails at any time using the
                unsubscribe link in any email we send, or by{' '}
                <Link href="/contact" style={{ color: '#7c3aed' }}>
                  contacting us
                </Link>
                .
              </li>
            </ul>
            <p>
              To exercise any of these rights, use our{' '}
              <Link href="/contact" style={{ color: '#7c3aed' }}>
                contact form
              </Link>{' '}
              and select <em>Privacy/Deletion</em> as the subject. We will respond within 30 days.
            </p>
          </Section>

          <Section title="6. Cookies &amp; Tracking">
            <p>
              We use minimal, functional tracking only. We do not use third-party advertising cookies.
              Our analytics consist of anonymous usage events logged server-side (no personal data).
            </p>
          </Section>

          <Section title="7. Security">
            <p>
              We take reasonable technical measures to protect the data we store, including encrypted
              connections (HTTPS) and restricted access controls. No method of transmission over the
              internet is 100% secure, but we work hard to protect your information.
            </p>
          </Section>

          <Section title="8. Changes to This Policy">
            <p>
              If we make material changes to this policy, we will update the effective date at the top
              of this page. Continued use of the site after changes means you accept the updated
              policy.
            </p>
          </Section>

          <Section title="9. Contact Us">
            <p>
              Questions about this Privacy Policy, or want to exercise your data rights?{' '}
              <Link href="/contact" style={{ color: '#7c3aed' }}>
                Use our contact form
              </Link>{' '}
              and choose <em>Privacy/Deletion</em> as the subject. We&apos;re happy to help!
            </p>
          </Section>
        </div>
      </main>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: '#5b21b6',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: '2px solid #ede9fe',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}
