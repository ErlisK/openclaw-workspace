'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { gtagConversion } from '@/lib/analytics'

export default function AduPermitAustinLandingPage() {
  useEffect(() => {
    // Track UTM params via dataLayer
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const utmData = {
        utm_source: params.get('utm_source'),
        utm_medium: params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign'),
        utm_content: params.get('utm_content'),
        utm_term: params.get('utm_term'),
        gclid: params.get('gclid'),
      }
      // Push to dataLayer for GTM / GA4
      if (window.dataLayer) {
        window.dataLayer.push({ event: 'lp_view', ...utmData })
      }
      // Store in sessionStorage for form attribution
      sessionStorage.setItem('utm_data', JSON.stringify(utmData))
    }
  }, [])

  const ctaUrl = '/request?utm_source=google&utm_medium=cpc&utm_campaign=austin-adu-permit&utm_content=rsa-anchor-199'

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-blue-700 text-white px-6 py-4 flex items-center justify-between">
        <div className="font-bold text-xl">ExpediteHub</div>
        <div className="text-sm text-blue-200">Austin ADU Permit Specialists</div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-700 to-blue-900 text-white px-6 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-block bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full mb-4">
            🏗️ Austin ADU Permit Experts
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
            Get Your Austin ADU<br />Permit Packet in 5 Days
          </h1>
          <p className="text-xl text-blue-100 mb-6">
            AI auto-fills 97% of City of Austin DSD forms. Licensed local expediters
            review &amp; submit. No back-and-forth. No wasted months.
          </p>
          <div className="inline-block bg-white/10 border border-white/20 rounded-xl px-6 py-3 mb-6">
            <span className="text-blue-200 text-sm">Flat fee: </span>
            <span className="text-yellow-400 text-3xl font-extrabold">$199</span>
            <span className="text-blue-200 text-sm ml-2">— no hidden costs</span>
          </div>
          <div className="block">
          <Link
            href={ctaUrl}
            className="inline-block bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold text-lg px-10 py-4 rounded-xl shadow-lg transition-all"
            onClick={() => gtagConversion('request_intent_submit')}
          >
            Start My ADU Permit → $199 Flat Fee
          </Link>
          </div>
          <p className="text-blue-200 text-sm mt-3">
            $199 flat fee · No hidden costs · Austin DSD specialists
          </p>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="bg-blue-50 border-b border-blue-100 py-4 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap gap-6 justify-center text-sm text-gray-600 font-medium">
          <span>✅ SF-3 &amp; SF-2 zones covered</span>
          <span>✅ Detached + attached ADUs</span>
          <span>✅ Garage conversions</span>
          <span>✅ City of Austin DSD portal</span>
          <span>✅ Permit corrections handled</span>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How ExpediteHub Works for Austin ADUs
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: '1',
              title: 'Post Your Project',
              desc: 'Enter your Austin address. Our AI looks up zoning, lot size, setbacks, and existing permits in seconds.',
              icon: '🏠',
            },
            {
              step: '2',
              title: 'AI Fills Your Forms',
              desc: 'The AI auto-fills the Austin BP-001 form, ECOS flood check, TPW drainage checklist, and more — 97% complete.',
              icon: '🤖',
            },
            {
              step: '3',
              title: 'Pro Submits to DSD',
              desc: 'A vetted Austin permit expediter reviews the packet, corrects any issues, and submits to the DSD portal.',
              icon: '📋',
            },
          ].map(s => (
            <div key={s.step} className="text-center">
              <div className="text-4xl mb-4">{s.icon}</div>
              <div className="inline-block bg-blue-700 text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center mb-3">
                {s.step}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why ExpediteHub */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-10">
            Why Austin Homeowners Choose ExpediteHub
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: '⚡', title: '5-Day Turnaround', desc: 'From project post to permit-ready packet in 5 business days. DSD submission same day as approval.' },
              { icon: '🤖', title: 'AI-Assisted Austin Forms', desc: 'Automatically fills BP-001, drainage checklist, impervious cover calculations, and more for City of Austin ADUs.' },
              { icon: '🔐', title: 'Licensed & Vetted Pros', desc: 'Every expediter is licensed, background-checked, and verified on Austin DSD. No unlicensed "permit runners."' },
              { icon: '💰', title: 'Competitive Quotes', desc: 'Multiple Austin expediters bid on your project. Average quote: $1,200–$2,500 vs. $5,000+ at traditional firms.' },
              { icon: '📑', title: 'Document Versioning', desc: 'All packet versions tracked. If DSD requests corrections, your pro updates and resubmits — included in scope.' },
              { icon: '🛡️', title: 'Escrow Protection', desc: 'Milestone-based escrow holds your deposit until each stage is complete. Full refund if permit is denied.' },
            ].map(f => (
              <div key={f.title} className="flex gap-4 bg-white p-5 rounded-xl border border-gray-100">
                <div className="text-2xl">{f.icon}</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-gray-600 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="bg-blue-700 text-white px-6 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Austin ADU Permit?</h2>
          <p className="text-blue-100 mb-8 text-lg">
            Join Austin homeowners who are cutting months off their ADU permit process.
            $199 flat fee — no surprises, no hourly billing.
          </p>
          <Link
            href={ctaUrl}
            className="inline-block bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold text-xl px-12 py-5 rounded-xl shadow-xl transition-all"
            onClick={() => gtagConversion('request_intent_submit')}
          >
            Get Started for $199 →
          </Link>
          <div className="flex justify-center gap-8 mt-6 text-blue-200 text-sm">
            <span>✓ $199 flat fee</span>
            <span>✓ Cancel anytime</span>
            <span>✓ 5-day turnaround</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Common Austin ADU Permit Questions</h2>
        <div className="space-y-4">
          {[
            {
              q: 'How long does an Austin ADU permit take?',
              a: 'Austin DSD currently takes 4–8 weeks for express permits and 3–6 months for standard permits after submission. Our 5-day guarantee covers getting a permit-ready packet ready for submission — not the DSD review timeline, which is out of our control.',
            },
            {
              q: 'What documents do I need for a City of Austin ADU permit?',
              a: 'Typically: site plan, floor plans, elevations, BP-001 form, drainage worksheet, impervious cover calculation, and sometimes a ECOS flood zone certification. ExpediteHub\'s AI pre-fills all of these based on your property data.',
            },
            {
              q: 'Is ExpediteHub a permit expediting firm?',
              a: 'ExpediteHub is a marketplace. We connect you with vetted, licensed Austin permit expediters who handle your DSD submission. We also provide AI-assisted form auto-fill to make the process faster and cheaper.',
            },
            {
              q: 'What zones can you help with in Austin?',
              a: 'SF-3, SF-2, SF-4A, SF-6, MF-1, and most other residential zoning categories in Austin. Our AI is trained on Austin\'s Land Development Code.',
            },
          ].map(faq => (
            <details key={faq.q} className="border border-gray-200 rounded-xl p-5 cursor-pointer">
              <summary className="font-semibold text-gray-900">{faq.q}</summary>
              <p className="text-gray-600 mt-3 text-sm leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 px-6 py-8 text-center text-sm">
        <p>© 2026 ExpediteHub · Austin, TX · <Link href="/request" className="text-blue-400 hover:underline">Get Started</Link> · <Link href="/pro" className="text-blue-400 hover:underline">For Pros</Link></p>
        <p className="mt-2 text-xs text-gray-600">ExpediteHub is a marketplace connecting homeowners with licensed permit professionals. Not a licensed contractor or engineering firm.</p>
      </footer>
    </main>
  )
}
