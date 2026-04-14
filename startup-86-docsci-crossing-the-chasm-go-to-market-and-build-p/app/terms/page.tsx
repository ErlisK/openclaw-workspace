export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: {new Date().getFullYear()}</p>

        <section className="space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="text-white font-semibold mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using DocsCI ("the Service"), you agree to be bound by these Terms of Service. If you disagree with any part, you may not use the Service.</p>
          </div>
          <div>
            <h2 className="text-white font-semibold mb-2">2. Description of Service</h2>
            <p>DocsCI provides a documentation CI/CD pipeline that executes code examples, detects API/SDK drift, and files PR comments. The Service is provided "as is" and may change at any time.</p>
          </div>
          <div>
            <h2 className="text-white font-semibold mb-2">3. User Accounts</h2>
            <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your credentials and all activity under your account.</p>
          </div>
          <div>
            <h2 className="text-white font-semibold mb-2">4. Acceptable Use</h2>
            <p>You may not use the Service to execute malicious code, circumvent security controls, or violate any applicable laws. We reserve the right to suspend accounts that violate these terms.</p>
          </div>
          <div>
            <h2 className="text-white font-semibold mb-2">5. Intellectual Property</h2>
            <p>You retain ownership of your content. By using the Service, you grant us a limited license to process your content as necessary to provide the Service.</p>
          </div>
          <div>
            <h2 className="text-white font-semibold mb-2">6. Limitation of Liability</h2>
            <p>DocsCI is not liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our maximum liability is limited to the amount you paid us in the preceding 12 months.</p>
          </div>
          <div>
            <h2 className="text-white font-semibold mb-2">7. Contact</h2>
            <p>For questions about these terms, email <a href="mailto:hello@snippetci.com" className="text-indigo-400 hover:underline">hello@snippetci.com</a>.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
