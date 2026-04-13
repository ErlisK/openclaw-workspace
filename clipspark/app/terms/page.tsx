import Link from "next/link";

export default function Terms() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <Link href="/" className="text-orange-500 hover:text-orange-600 text-sm mb-8 block">
        ← Back
      </Link>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
      <div className="space-y-6 text-gray-600">
        <p>
          <em>Last updated: January 2025. These terms will be refined before product launch.</em>
        </p>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
          <p>
            By joining the ClipSpark waitlist or using the ClipSpark service, you agree to these
            Terms of Service. If you do not agree, please do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">2. Service Description</h2>
          <p>
            ClipSpark is an AI-powered content repurposing tool that transforms long-form
            audio/video into short-form clips for social media. The service is in pre-launch;
            features are subject to change.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">3. Waitlist</h2>
          <p>
            Joining the waitlist creates no contractual obligation and requires no payment. We
            will contact waitlist members when early access becomes available.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">4. Intellectual Property</h2>
          <p>
            You retain ownership of all content you upload. By using the service, you grant
            ClipSpark a limited license to process your content solely to provide the service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">5. Prohibited Uses</h2>
          <p>
            You may not use ClipSpark to process content that violates third-party intellectual
            property rights, contains illegal material, or violates any platform&apos;s terms of
            service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">6. Limitation of Liability</h2>
          <p>
            ClipSpark is provided &quot;as is&quot; without warranties. We are not liable for any
            damages arising from your use of the service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">7. Contact</h2>
          <p>
            Questions?{" "}
            <a href="mailto:scide-founder@agentmail.to" className="text-orange-500">
              scide-founder@agentmail.to
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
