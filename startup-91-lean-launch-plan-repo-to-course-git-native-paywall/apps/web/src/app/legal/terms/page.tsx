import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — TeachRepo',
  description: 'TeachRepo Terms of Service',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <h1 className="mb-8 text-4xl font-bold tracking-tight text-gray-900">Terms of Service</h1>
      <p className="mb-4 text-sm text-gray-500">Last updated: April 2025</p>
      <div className="space-y-8 text-gray-700">
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">1. Acceptance</h2>
          <p>By accessing or using TeachRepo (&quot;Service&quot;) you agree to be bound by these Terms. If you disagree, do not use the Service.</p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">2. Service Description</h2>
          <p>TeachRepo lets creators publish and sell courses built from Git repositories and Markdown files. Learners purchase and access those courses through the platform.</p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">3. Accounts</h2>
          <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your credentials. You must be at least 18 years old to use this Service.</p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">4. Payments &amp; Refunds</h2>
          <p>
            Payments are processed by Stripe. Course prices are set by creators. Refund requests are handled
            on a case-by-case basis within 14 days of purchase — contact{' '}
            <a href="mailto:hello@teachrepo.com" className="text-violet-600 hover:underline">
              hello@teachrepo.com
            </a>
            . Access to a course is revoked upon a confirmed refund.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">5. Creator Responsibilities</h2>
          <p>
            Creators retain ownership of their content and are responsible for ensuring it does not
            infringe on third-party intellectual property rights, contain illegal material, or violate our
            community standards. TeachRepo reserves the right to remove non-compliant content.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">6. Intellectual Property</h2>
          <p>
            Creators retain ownership of their course content. By publishing on TeachRepo, you grant us a
            limited license to host, display, and deliver your content to enrolled learners. Learners may
            not redistribute, resell, or copy course content.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">7. Prohibited Uses</h2>
          <p>
            You may not use the Service to violate any law or regulation, transmit spam or malicious code,
            attempt to gain unauthorized access to any system, or engage in any activity that disrupts the
            Service.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">8. Limitation of Liability</h2>
          <p>
            The Service is provided &quot;as is&quot; without warranties of any kind. To the maximum extent
            permitted by law, TeachRepo shall not be liable for any indirect, incidental, or consequential
            damages.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">9. Termination</h2>
          <p>
            We reserve the right to suspend or terminate accounts that violate these terms. You may delete
            your account at any time by contacting us.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">10. Changes</h2>
          <p>We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance.</p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">11. Contact</h2>
          <p>
            Questions?{' '}
            <a href="mailto:hello@teachrepo.com" className="text-violet-600 hover:underline">
              hello@teachrepo.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
