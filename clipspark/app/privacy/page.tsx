import Link from "next/link";

export default function Privacy() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <Link href="/" className="text-orange-500 hover:text-orange-600 text-sm mb-8 block">
        ← Back
      </Link>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
      <div className="space-y-6 text-gray-600">
        <p>
          <em>Last updated: January 2025. This policy will be refined before product launch.</em>
        </p>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">1. Information We Collect</h2>
          <p>
            When you join the waitlist: email address, optional creator type, optional audience
            size, optional notes, your browser user agent, and a SHA-256 hashed version of your
            IP address (we never store your raw IP).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">2. How We Use It</h2>
          <p>
            To send you launch updates, understand our early audience, and prevent spam
            submissions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">3. Data Storage</h2>
          <p>
            Waitlist data is stored securely in a private GitHub repository. We do not sell or
            share your personal information with third parties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">4. Your Rights</h2>
          <p>
            Request deletion at any time by emailing{" "}
            <a href="mailto:scide-founder@agentmail.to" className="text-orange-500">
              scide-founder@agentmail.to
            </a>
            . Processed within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">5. Analytics</h2>
          <p>
            We use Vercel Analytics to understand how visitors use our site (anonymous page
            views, referrers, device types). No personally identifiable information is included
            in analytics data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">6. Contact</h2>
          <p>
            <a href="mailto:scide-founder@agentmail.to" className="text-orange-500">
              scide-founder@agentmail.to
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
