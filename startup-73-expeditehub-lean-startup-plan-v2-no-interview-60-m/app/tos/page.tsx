import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — ExpediteHub',
  description: 'ExpediteHub Terms of Service and AI Disclaimer',
}

const EFFECTIVE_DATE = 'April 12, 2026'
const VERSION = 'v1.0'

export default function ToSPage() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4">
        <Link href="/" className="font-bold text-xl text-blue-700">ExpediteHub</Link>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-12 prose prose-gray">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">
          Effective: {EFFECTIVE_DATE} · Version: {VERSION} ·{' '}
          <a href="mailto:scide-founder@agentmail.to" className="text-blue-600 hover:underline">
            Contact
          </a>
        </p>

        {/* ── 1. About ExpediteHub ─── */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">1. About ExpediteHub</h2>
          <p className="text-gray-600">
            ExpediteHub, Inc. ("<strong>ExpediteHub</strong>", "we", "us") operates an online marketplace
            connecting homeowners (<strong>"Homeowners"</strong>) with vetted, licensed local permit
            expediters, plan drafters, and code consultants (<strong>"Pros"</strong>).
            By creating an account, submitting a project, or using any ExpediteHub service, you
            agree to these Terms of Service.
          </p>
        </section>

        {/* ── 2. AI-Assisted Forms Disclaimer ─── */}
        <section className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-amber-900 mb-3">
            ⚠️ 2. AI-Assisted Forms — Important Disclaimer
          </h2>
          <p className="text-amber-800 mb-3">
            ExpediteHub uses artificial intelligence (AI) to auto-fill permit application forms
            (including but not limited to Austin&apos;s BP-001 form) based on information you provide
            and publicly available GIS/parcel data.
          </p>
          <ul className="list-disc list-inside space-y-2 text-amber-800">
            <li>
              <strong>AI-generated content may contain errors.</strong> Auto-filled values such as
              lot dimensions, zoning classifications, impervious cover calculations, and setbacks are
              estimates derived from data sources that may be incomplete, outdated, or incorrect.
            </li>
            <li>
              <strong>A licensed professional reviews the packet before submission.</strong> Your
              matched Pro is responsible for verifying all form fields against authoritative
              municipal records before submitting to any municipality.
            </li>
            <li>
              <strong>Municipality acceptance is not guaranteed.</strong> AI-assisted pre-fill does
              not constitute a representation that the municipality will accept, approve, or issue
              a permit for your project.
            </li>
            <li>
              <strong>You retain final responsibility.</strong> You are responsible for reviewing
              the draft packet with your Pro before approval and for ensuring accuracy of the
              information you provide.
            </li>
          </ul>
        </section>

        {/* ── 3. Municipality Submission ─── */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">3. Municipality Submission</h2>
          <p className="text-gray-600 mb-3">
            ExpediteHub may facilitate electronic document preparation and submission workflows.
            However:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>
              <strong>Manual confirmation may be required.</strong> Electronic submission to a
              municipality may require your Pro to physically present documents, attend a counter
              appointment, or take other manual steps. ExpediteHub does not guarantee fully
              automated submission for any municipality.
            </li>
            <li>
              <strong>Processing times are estimates.</strong> Stated permit processing timelines
              are based on historical municipal data and are not binding commitments.
            </li>
            <li>
              <strong>Municipal requirements change.</strong> Permit forms, fees, and requirements
              are set by municipalities and may change without notice.
            </li>
          </ul>
        </section>

        {/* ── 4. Escrow and Payments ─── */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">4. Escrow and Payments</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>
              <strong>Deposits are held in milestone escrow.</strong> Your deposit is authorized on
              your card but not captured (charged) until a match is confirmed and you approve the
              Pro&apos;s quote.
            </li>
            <li>
              <strong>Refund policy.</strong> Deposits are 100% refundable if no Pro match is made
              within 5 business days of project submission. Refunds for project cancellations after
              a match are governed by the milestone schedule in your accepted quote.
            </li>
            <li>
              <strong>Stripe processes payments.</strong> ExpediteHub uses Stripe, Inc. for payment
              processing. You agree to Stripe&apos;s{' '}
              <a href="https://stripe.com/legal/ssa" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Services Agreement
              </a>.
            </li>
          </ul>
        </section>

        {/* ── 5. Pro Vetting ─── */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">5. Pro Vetting and License Verification</h2>
          <p className="text-gray-600">
            All Pros on ExpediteHub are required to provide proof of applicable licenses and
            insurance. ExpediteHub performs initial verification but does not guarantee license
            currency, scope, or quality of work. You are encouraged to independently verify Pro
            credentials through your state licensing board.
          </p>
        </section>

        {/* ── 6. Data and Privacy ─── */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">6. Data Use and Privacy</h2>
          <p className="text-gray-600 mb-2">By submitting a project, you consent to:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>
              Sharing your project details (address, project type, plans, and uploaded documents)
              with vetted Pros for the purpose of quoting and permit processing.
            </li>
            <li>
              Use of your anonymized project data to improve AI form-fill accuracy and
              jurisdiction-specific templates.
            </li>
          </ul>
          <p className="text-gray-600 mt-3">
            We do not sell your personal information to third parties. See our Privacy Policy
            for full details.
          </p>
        </section>

        {/* ── 7. Limitation of Liability ─── */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">7. Limitation of Liability</h2>
          <p className="text-gray-600">
            To the maximum extent permitted by law, ExpediteHub&apos;s total liability for any claim
            arising from your use of the platform is limited to the amount of fees you paid
            ExpediteHub in the 12 months preceding the claim. ExpediteHub is not liable for
            indirect, incidental, consequential, or punitive damages, including permit denials,
            municipal fines, or construction delays.
          </p>
        </section>

        {/* ── 8. Changes ─── */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">8. Changes to These Terms</h2>
          <p className="text-gray-600">
            We may update these Terms at any time. Material changes will be announced via email
            and displayed on this page with a new effective date. Continued use of the platform
            after the updated effective date constitutes acceptance.
          </p>
        </section>

        {/* ── 9. Governing Law ─── */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">9. Governing Law</h2>
          <p className="text-gray-600">
            These Terms are governed by the laws of the State of Texas, without regard to conflict
            of law provisions. Any disputes shall be resolved in the state or federal courts located
            in Travis County, Texas.
          </p>
        </section>

        <p className="text-sm text-gray-400 mt-12 border-t border-gray-100 pt-6">
          ExpediteHub · Austin, TX · Version {VERSION} · {EFFECTIVE_DATE}
        </p>
      </article>
    </main>
  )
}
