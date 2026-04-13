import type { Metadata } from 'next'
import Link from 'next/link'
import PolicyViewTracker from '../components/PolicyViewTracker'

export const metadata: Metadata = {
  title: 'Terms of Service — KidColoring',
  description: 'Terms and conditions for using KidColoring. Kid-safe, parent-managed.',
}

export default function TermsPage() {
  return (
    <>
      <PolicyViewTracker pageName="terms" path="/terms" />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 64px' }}>
        <div style={{ marginBottom: 32 }}>
          <Link href="/" style={{ color: '#7c3aed', textDecoration: 'none', fontSize: 14 }}>
            ← Back to KidColoring
          </Link>
        </div>

        <h1 style={{ fontSize: 38, fontWeight: 900, color: '#7c3aed', marginBottom: 8 }}>
          📋 Terms of Service
        </h1>
        <p style={{ color: '#6b7280', marginBottom: 40, fontSize: 15 }}>
          <strong>Effective Date:</strong> June 1, 2026
        </p>

        <div style={{ lineHeight: 1.8, color: '#374151' }}>
          <p>
            Welcome to <strong>KidColoring</strong>! By accessing or using our website (
            <strong>kidcoloring-landing.vercel.app</strong> and associated domains), you agree to
            these Terms of Service. Please read them carefully.
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
            ⚠️ <strong>Not Legal Advice:</strong> These terms are provided for informational
            purposes only and do not constitute legal advice. If you have specific legal concerns,
            please consult a qualified attorney.
          </p>

          <Section title="1. Kid Safety &amp; Parental Supervision">
            <p>
              KidColoring is a service intended to be set up and managed by <strong>parents or
              legal guardians</strong>. Children should use KidColoring only under adult supervision.
            </p>
            <ul>
              <li>
                <strong>Parents and guardians are responsible</strong> for ensuring the service is
                used appropriately by children in their care.
              </li>
              <li>
                By using KidColoring, you confirm that you are a parent or guardian aged 18 or older,
                or that you have parental consent to use the service.
              </li>
              <li>
                We design all content to be age-appropriate and kid-safe. If you encounter anything
                concerning, please{' '}
                <Link href="/contact" style={{ color: '#7c3aed' }}>
                  contact us immediately
                </Link>
                .
              </li>
            </ul>
          </Section>

          <Section title="2. Acceptable Use">
            <p>When using KidColoring, you agree to:</p>
            <ul>
              <li>Use the service only for lawful, kid-safe purposes.</li>
              <li>Not attempt to upload, generate, or request content that is harmful, offensive, or inappropriate for children.</li>
              <li>Not attempt to reverse-engineer, scrape, or abuse the service in any way.</li>
              <li>Not impersonate any person or entity, or misrepresent your affiliation.</li>
              <li>Provide accurate information (especially email address) when signing up.</li>
            </ul>
            <p>
              We reserve the right to remove any user from the waitlist or terminate access if
              these terms are violated.
            </p>
          </Section>

          <Section title="3. Intellectual Property">
            <p>
              All content on the KidColoring website — including text, graphics, logos, and the
              KidColoring name — is owned by or licensed to KidColoring and is protected by
              applicable intellectual property laws.
            </p>
            <p>
              When KidColoring generates coloring pages based on a parent&apos;s or child&apos;s
              inputs, the parent/guardian retains rights to use those generated images for personal,
              non-commercial use (printing and coloring at home). Commercial use is not permitted
              without express written permission.
            </p>
          </Section>

          <Section title="4. License to Use the Site">
            <p>
              We grant you a limited, non-exclusive, non-transferable, revocable licence to access
              and use the KidColoring website for personal, non-commercial purposes consistent with
              these Terms.
            </p>
            <p>
              This licence does not include the right to: resell or redistribute any part of the
              service; use automated tools to scrape or download content; or copy the service for
              any commercial purpose.
            </p>
          </Section>

          <Section title="5. Privacy">
            <p>
              Your use of KidColoring is also governed by our{' '}
              <Link href="/privacy" style={{ color: '#7c3aed' }}>
                Privacy Policy
              </Link>
              , which is incorporated into these Terms by reference.
            </p>
          </Section>

          <Section title="6. Disclaimers">
            <p>
              KidColoring is provided <strong>&quot;as is&quot;</strong> without warranties of any
              kind, express or implied. We do not warrant that the service will be uninterrupted,
              error-free, or free of harmful components.
            </p>
            <p>
              AI-generated coloring pages may occasionally produce unexpected results. Parents and
              guardians should review all generated content before sharing with children.
            </p>
          </Section>

          <Section title="7. Limitation of Liability">
            <p>
              To the maximum extent permitted by applicable law, KidColoring and its founders,
              employees, and affiliates shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages arising from your use of (or inability to use) the
              service.
            </p>
            <p>
              Our total liability to you for any claim related to the service shall not exceed the
              amount you have paid to us in the 12 months prior to the claim (which may be zero
              during the free waitlist/preview period).
            </p>
          </Section>

          <Section title="8. Termination">
            <p>
              We may suspend or terminate your access to KidColoring at any time, for any reason,
              including violation of these Terms. You may stop using the service at any time. If
              you have joined the waitlist and wish to be removed, please{' '}
              <Link href="/contact" style={{ color: '#7c3aed' }}>
                contact us
              </Link>
              .
            </p>
          </Section>

          <Section title="9. Governing Law">
            <p>
              These Terms are governed by the laws of <strong>[Jurisdiction — TBD]</strong>. Any
              disputes will be resolved in the courts of that jurisdiction. (We will update this
              section when the company is formally established.)
            </p>
          </Section>

          <Section title="10. Changes to These Terms">
            <p>
              We may update these Terms from time to time. When we do, we will update the effective
              date above. Continued use of the site after changes means you accept the updated Terms.
            </p>
          </Section>

          <Section title="11. Contact Us">
            <p>
              Questions about these Terms?{' '}
              <Link href="/contact" style={{ color: '#7c3aed' }}>
                Reach out via our contact form
              </Link>
              . We&apos;re a small, parent-run team and we&apos;re happy to help.
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
