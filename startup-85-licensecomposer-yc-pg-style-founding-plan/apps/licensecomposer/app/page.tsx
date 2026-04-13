import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'PactTailor — Plain-English Contracts for Indie Creators',
  description: 'Generate jurisdiction-aware, plain-English contracts for your digital products in under 2 minutes. Commercial licenses, commission agreements, collaborator splits, and NFT licenses. Free to start.',
  openGraph: {
    title: 'PactTailor — Plain-English Contracts for Indie Creators',
    description: 'Answer 5 questions. Get a ready-to-sign contract. Free to start, $9/yr for unlimited.',
    url: 'https://pacttailor.com',
    images: [{ url: 'https://pacttailor.com/og-card.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PactTailor — Plain-English Contracts for Indie Creators',
    description: 'Answer 5 questions. Get a ready-to-sign contract.',
  },
};

const STEPS = [
  { icon: '🎨', step: '01', title: 'Pick your contract type', body: 'Commercial license, commission agreement, collaborator split, or NFT license. Select the one that fits.' },
  { icon: '📍', step: '02', title: 'Set jurisdiction & platform', body: 'US, EU, UK, AU — and Etsy, Gumroad, itch.io, OpenSea. We tailor the language to your specific market.' },
  { icon: '⚡', step: '03', title: 'Instant plain-English contract', body: 'A ready-to-use, versioned contract with provenance hash. Download as PDF, Markdown, or HTML.' },
];

const FEATURES = [
  { icon: '⚖️', title: 'Jurisdiction-aware', body: 'Templates for US, EU, UK, AU, and CA. Clause language adapts to local law — no one-size-fits-all boilerplate.' },
  { icon: '🔒', title: 'Provenance-hashed', body: 'Every contract has a SHA-256 provenance hash so buyers can verify the document hasn\'t been tampered with.' },
  { icon: '🏪', title: 'Embeddable badge', body: 'One-click "Publish" drops an embeddable badge on your Gumroad, Etsy, or itch.io storefront. Buyers see your license instantly.' },
  { icon: '📋', title: 'Hosted license page', body: 'Every contract gets a public /l/:slug URL. Buyers can read and accept — their IP + timestamp recorded for your records.' },
  { icon: '🔄', title: 'Version history', body: 'Minor edits create a new version. Every change is logged so you and your buyers always know which terms were in effect when.' },
  { icon: '🤝', title: 'Lawyer-reviewed templates', body: 'Premium templates are vetted by practicing IP attorneys. Pay $5 once, use forever — or get all with Unlimited.' },
];

const SOCIAL_PROOF = [
  { name: 'Maya T.', role: 'Digital artist, Etsy', quote: 'I used to just put "all rights reserved" in my listings. Now I have an actual commercial license that buyers can read and accept. Took me 3 minutes.' },
  { name: 'James R.', role: 'Freelance illustrator', quote: 'Finally a tool that doesn\'t make me feel like I need a law degree. The commission agreement is clear, professional, and my clients actually like it.' },
  { name: 'Sara W.', role: 'NFT creator, OpenSea', quote: 'The NFT license template covers everything — secondary sales, commercial use, modification rights. $5 well spent.' },
];

const FAQ = [
  { q: 'Is this legal advice?', a: 'No. PactTailor generates template documents, not legal advice. Templates are starting points — for jurisdiction-specific guidance, consult a licensed attorney. See our Disclaimer.' },
  { q: 'Who are these templates for?', a: 'Independent digital creators: illustrators, game asset creators, font designers, musicians, NFT artists, and freelancers. Not for large enterprise agreements.' },
  { q: 'What jurisdictions do you support?', a: 'United States (federal + state law), European Union (GDPR-aligned), United Kingdom, Australia, and Canada. More coming.' },
  { q: 'Can I customize the contract text?', a: 'Yes — the minor edit feature lets you make changes, which creates a new versioned document. Major structural changes are best done with an attorney.' },
  { q: 'How does the free tier work?', a: '2 contract exports per month. No credit card required. Upgrade to Unlimited ($9/yr) for unlimited exports, all premium templates, hosted license pages, and version history.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 sticky top-0 z-40 bg-white/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="font-bold text-indigo-700 text-xl tracking-tight">PactTailor</Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/templates" className="text-gray-600 hover:text-gray-900 hidden sm:block">Templates</Link>
            <Link href="/pricing" className="text-gray-600 hover:text-gray-900 hidden sm:block">Pricing</Link>
            <Link href="/docs" className="text-gray-600 hover:text-gray-900 hidden sm:block">Docs</Link>
            <Link href="/login" className="text-gray-600 hover:text-gray-900">Sign in</Link>
            <Link href="/signup" className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          ✨ Plain-English · Lawyer-vetted templates · 2-minute setup
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight max-w-4xl mx-auto">
          Contracts for indie creators,<br className="hidden sm:block" />
          <span className="text-indigo-600"> not corporations.</span>
        </h1>
        <p className="text-xl text-gray-500 mt-6 max-w-2xl mx-auto leading-relaxed">
          Answer 5 questions. Get a jurisdiction-aware, plain-English contract for your digital products — commercial licenses, commission agreements, collaborator splits, and NFT licenses.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Link
            href="/wizard"
            className="bg-indigo-600 text-white font-bold text-lg px-8 py-3.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            ⚡ Generate your first contract — free
          </Link>
          <Link
            href="/templates"
            className="text-gray-600 border border-gray-200 px-6 py-3.5 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Browse templates →
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-4">No credit card · 2 free exports/month · Takes 2 minutes</p>
      </section>

      {/* Social proof strip */}
      <section className="border-y border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">✅ <strong className="text-gray-700">18</strong> templates (14 free + 4 premium)</span>
          <span className="flex items-center gap-1.5">🌍 <strong className="text-gray-700">5</strong> jurisdictions</span>
          <span className="flex items-center gap-1.5">🏪 Etsy · Gumroad · itch.io · OpenSea</span>
          <span className="flex items-center gap-1.5">⚖️ Lawyer-vetted premium templates</span>
          <span className="flex items-center gap-1.5">🔒 SHA-256 provenance hashing</span>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">How it works</h2>
          <p className="text-gray-500 mt-2">Three steps from idea to signed contract.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((s) => (
            <div key={s.step} className="relative p-6 rounded-2xl border border-gray-200 hover:border-indigo-200 hover:shadow-sm transition-all">
              <div className="text-3xl mb-3">{s.icon}</div>
              <div className="text-xs font-bold text-indigo-600 mb-1">STEP {s.step}</div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link href="/wizard" className="inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors">
            Try it now — free →
          </Link>
        </div>
      </section>

      {/* Features grid */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Everything you need, nothing you don&apos;t.</h2>
            <p className="text-gray-500 mt-2">Built specifically for indie digital creators.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Creators using PactTailor</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SOCIAL_PROOF.map((t) => (
            <div key={t.name} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <p className="text-gray-700 text-sm leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-4">
                <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                <div className="text-xs text-gray-500">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="bg-indigo-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold text-white">Start free. Upgrade when you&apos;re ready.</h2>
          <p className="text-indigo-200 mt-3 text-lg">2 free exports every month. Unlimited for $9/year — less than a coffee.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link
              href="/wizard"
              className="bg-white text-indigo-700 font-bold px-8 py-3.5 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              Start free →
            </Link>
            <Link
              href="/pricing"
              className="text-indigo-200 border border-indigo-400 px-6 py-3.5 rounded-xl hover:bg-indigo-500 transition-colors"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">FAQ</h2>
        </div>
        <div className="space-y-4">
          {FAQ.map((item) => (
            <div key={item.q} className="border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-1">{item.q}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
            <div>
              <div className="font-bold text-gray-900 mb-3">PactTailor</div>
              <p className="text-gray-500 text-xs leading-relaxed">Plain-English contracts for indie digital creators.</p>
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-3">Product</div>
              <div className="space-y-2 text-gray-500">
                <div><Link href="/wizard" className="hover:text-gray-900">Generate contract</Link></div>
                <div><Link href="/templates" className="hover:text-gray-900">Templates</Link></div>
                <div><Link href="/pricing" className="hover:text-gray-900">Pricing</Link></div>
                <div><Link href="/docs" className="hover:text-gray-900">Docs</Link></div>
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-3">Legal</div>
              <div className="space-y-2 text-gray-500">
                <div><Link href="/legal/terms" className="hover:text-gray-900">Terms of Service</Link></div>
                <div><Link href="/legal/privacy" className="hover:text-gray-900">Privacy Policy</Link></div>
                <div><Link href="/legal/disclaimer" className="hover:text-gray-900">Legal Disclaimer</Link></div>
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-3">Contact</div>
              <div className="space-y-2 text-gray-500">
                <div><a href="mailto:hello@pacttailor.com" className="hover:text-gray-900">hello@pacttailor.com</a></div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-6 text-xs text-gray-400 text-center">
            <p>⚠️ PactTailor generates template documents, not legal advice. Consult a licensed attorney for jurisdiction-specific guidance.</p>
            <p className="mt-1">© {new Date().getFullYear()} PactTailor. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
