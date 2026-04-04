import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — KidColoring',
  description: 'Terms of Service for KidColoring — personalized coloring books for kids.',
}

const LAST_UPDATED = 'April 4, 2026'
const EMAIL        = 'hello@kidcoloring.app'
const APP_URL      = 'https://kidcoloring-research.vercel.app'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-extrabold text-violet-700 text-lg">🎨 KidColoring</Link>
          <Link href="/privacy" className="text-sm text-gray-500 hover:text-violet-600">Privacy →</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">1. Acceptance</h2>
            <p>
              By accessing KidColoring at <a href={APP_URL} className="text-violet-600 hover:underline">{APP_URL}</a>, you agree to these Terms of Service.
              If you&apos;re using the service for a child, you confirm you are the child&apos;s parent or legal guardian
              and accept these terms on their behalf.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">2. Service description</h2>
            <p>
              KidColoring generates personalized coloring books using AI image generation. You provide text
              prompts (hero name, interests, themes); we generate coloring-book-style illustrations for personal,
              non-commercial use.
            </p>
            <p className="mt-2">
              Free trial: 4 pages per session, no account required.<br/>
              Paid tiers: full-length books (up to 12 pages), PDF download, saved history.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">3. Account requirements</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Accounts require a valid parent/guardian email address.</li>
              <li>Children under 13 may not create their own accounts.</li>
              <li>You must be 18 or older to create an account and add child profiles.</li>
              <li>You are responsible for all activity under your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">4. Content standards</h2>
            <p>
              KidColoring is designed for children ages 2–12. Our AI content safety filter blocks
              inappropriate content, but you also agree not to:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>Submit prompts containing violence, adult content, hate speech, or illegal material</li>
              <li>Attempt to generate realistic images of real people</li>
              <li>Use the service to generate content that could harm children</li>
              <li>Bypass or attempt to circumvent our content safety filters</li>
            </ul>
            <p className="mt-3">
              Violation may result in immediate account suspension without refund.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">5. Payments and refunds</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Payments are processed by Stripe. We accept major credit/debit cards.</li>
              <li>Per-book purchases are one-time charges for a single PDF download.</li>
              <li>Subscriptions renew monthly. Cancel anytime from your account page.</li>
              <li>
                <strong>Refund policy:</strong> If the generated book has a technical error (e.g., missing pages,
                broken images), contact us within 7 days for a full refund. We do not offer refunds for
                subjective dissatisfaction with AI-generated artwork.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">6. Intellectual property</h2>
            <p>
              Generated images are created using Pollinations.ai&apos;s API. We grant you a
              <strong> personal, non-commercial license</strong> to print and use the generated coloring pages
              for home, school, or non-commercial educational use.
            </p>
            <p className="mt-2">You may NOT:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Resell or commercially distribute generated coloring pages</li>
              <li>Use generated images in commercial products without our written consent</li>
              <li>Remove or obscure the &ldquo;Made with KidColoring&rdquo; attribution on PDFs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">7. Referral program</h2>
            <p>
              Our referral program grants 1 free book credit per 3 successful referrals.
              Credits have no cash value and cannot be transferred. We reserve the right to cancel
              or modify the referral program with 14 days&apos; notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">8. Limitation of liability</h2>
            <p>
              KidColoring is provided &ldquo;as is.&rdquo; We make no guarantees about the artistic quality
              of AI-generated images. Our liability is limited to the amount you paid in the 30 days
              preceding your claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">9. Service availability</h2>
            <p>
              We aim for 99% uptime but cannot guarantee uninterrupted service.
              Scheduled maintenance will be communicated via email when possible.
              We are not liable for third-party service outages (Vercel, Supabase, Pollinations.ai).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">10. Termination</h2>
            <p>
              You may delete your account at any time. We may suspend accounts that violate these terms.
              Upon termination, we delete your personal data within 30 days (payment records retained
              7 years per legal requirements).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">11. Changes to these terms</h2>
            <p>
              We may update these terms with 14 days&apos; notice via email. Continued use after the
              effective date constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">12. Contact</h2>
            <p>
              Questions? <a href={`mailto:${EMAIL}`} className="text-violet-600 hover:underline">{EMAIL}</a>
            </p>
          </section>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-200 flex gap-6 text-sm">
          <Link href="/privacy" className="text-violet-600 hover:underline">Privacy Policy →</Link>
          <Link href="/coppa" className="text-violet-600 hover:underline">COPPA Notice →</Link>
          <Link href="/" className="text-gray-500 hover:underline">← Back to KidColoring</Link>
        </div>
      </div>
    </div>
  )
}
