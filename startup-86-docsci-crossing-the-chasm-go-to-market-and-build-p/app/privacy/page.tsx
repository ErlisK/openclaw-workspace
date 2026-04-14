export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: {new Date().getFullYear()}</p>

        <section className="space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="text-white font-semibold mb-2">1. Information We Collect</h2>
            <p>We collect information you provide directly (name, email, organization), usage data (runs, findings, API calls), and technical data (IP address, browser type) to provide and improve the Service.</p>
          </div>
          <div>
            <h2 className="text-white font-semibold mb-2">2. How We Use Your Information</h2>
            <p>We use collected information to provide the Service, improve our features, send transactional emails, and comply with legal obligations. We do not sell your personal data.</p>
          </div>
          <div>
            <h2 className="text-white font-semibold mb-2">3. Data Retention</h2>
            <p>We retain your data for as long as your account is active or as needed to provide the Service. You may request deletion of your data at any time.</p>
          </div>
          <div>
            <h2 className="text-white font-semibold mb-2">4. Security</h2>
            <p>We implement industry-standard security measures including encryption at rest and in transit, hermetic sandbox execution environments, and access controls.</p>
          </div>
          <div>
            <h2 className="text-white font-semibold mb-2">5. Third-Party Services</h2>
            <p>We use Supabase for database/auth, Vercel for hosting, and PostHog for analytics. Each has their own privacy policies governing their use of data.</p>
          </div>
          <div>
            <h2 className="text-white font-semibold mb-2">6. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have rights to access, correct, or delete your personal data. Contact us to exercise these rights.</p>
          </div>
          <div>
            <h2 className="text-white font-semibold mb-2">7. Contact</h2>
            <p>For privacy questions, email <a href="mailto:hello@snippetci.com" className="text-indigo-400 hover:underline">hello@snippetci.com</a>.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
