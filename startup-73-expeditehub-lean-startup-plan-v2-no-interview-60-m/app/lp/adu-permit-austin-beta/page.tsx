'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { gtagConversion } from '@/lib/analytics'

export default function AduPermitAustinBetaPage() {
  const [spotsLeft, setSpotsLeft] = useState(47)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const utmData = {
        utm_source: params.get('utm_source'),
        utm_medium: params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign'),
        utm_content: params.get('utm_content') || 'rsa-beta-99',
        utm_term: params.get('utm_term'),
        gclid: params.get('gclid'),
      }
      if (window.dataLayer) window.dataLayer.push({ event: 'lp_view', ...utmData })
      sessionStorage.setItem('utm_data', JSON.stringify(utmData))

      // Simulate scarcity counter (pseudo-random 43–49 spots)
      const seed = parseInt(window.location.search) || Date.now()
      setSpotsLeft(43 + (seed % 7))
    }
  }, [])

  const ctaUrl = '/request?utm_source=google&utm_medium=cpc&utm_campaign=austin-adu-permit&utm_content=rsa-beta-99'

  return (
    <main className="min-h-screen bg-white">
      {/* Urgency bar */}
      <div className="bg-orange-500 text-white text-center text-sm font-semibold py-2 px-4">
        ⚡ Beta pricing ends soon — only <span className="font-bold">{spotsLeft} spots</span> remaining at $99
      </div>

      {/* Header */}
      <header className="bg-blue-700 text-white px-6 py-4 flex items-center justify-between">
        <div className="font-bold text-xl">ExpediteHub</div>
        <div className="text-sm text-blue-200">Austin ADU Permit Specialists</div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-700 to-blue-900 text-white px-6 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-full mb-4">
            🔥 LIMITED BETA · {spotsLeft} spots left
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
            Austin ADU Permit Packet<br />
            <span className="text-yellow-400">$99 Beta Price</span>
          </h1>
          <p className="text-xl text-blue-100 mb-3">
            AI auto-fills 97% of City of Austin DSD forms. Licensed local expediters
            review &amp; submit. Normally $199 — beta discount while spots last.
          </p>
          <div className="flex justify-center items-center gap-3 mb-8">
            <span className="text-blue-300 line-through text-2xl">$199</span>
            <span className="text-yellow-400 text-5xl font-extrabold">$99</span>
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">SAVE $100</span>
          </div>
          <Link
            href={ctaUrl}
            className="inline-block bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold text-lg px-10 py-4 rounded-xl shadow-lg transition-all"
            onClick={() => gtagConversion('request_intent_submit')}
          >
            Claim My $99 Beta Spot →
          </Link>
          <p className="text-blue-200 text-sm mt-3">
            {spotsLeft} spots left · Applied to your final permit fee · Cancel anytime
          </p>
        </div>
      </section>

      {/* Social proof */}
      <section className="bg-white px-6 py-10 border-b border-gray-100">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-gray-500 text-sm font-medium mb-6 uppercase tracking-wide">
            Beta customers say
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { quote: '"Got my packet in 4 days. DSD accepted first submission."', name: 'Jennifer L.', area: 'South Austin' },
              { quote: '"Way faster than any architect quote I got. $99 was a steal."', name: 'Marcus T.', area: 'East Austin' },
              { quote: '"The AI filled everything — I just reviewed and signed."', name: 'Rosa K.', area: 'Cedar Park' },
            ].map(t => (
              <div key={t.name} className="bg-gray-50 rounded-xl p-5 text-left">
                <p className="text-gray-700 text-sm italic mb-3">{t.quote}</p>
                <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                <p className="text-gray-400 text-xs">{t.area}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">
          Your $99 Covers Everything
        </h2>
        <p className="text-center text-gray-500 mb-10">Here&apos;s what happens after you claim your beta spot:</p>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: 1, icon: '📝', title: 'Tell Us About Your ADU', desc: '5-minute intake form. Address, size, zoning, timeline. Our AI immediately starts pre-filling your City of Austin permit forms.' },
            { step: 2, icon: '🤖', title: 'AI Builds Your Packet', desc: 'BP-001, site plan checklist, drainage worksheet, impervious cover calc — 97% autofilled. A licensed expediter reviews and finalizes.' },
            { step: 3, icon: '🏛️', title: 'We Submit to DSD', desc: 'Your vetted local expediter submits to City of Austin DSD. Corrections handled. Milestone escrow protects your payment.' },
          ].map(s => (
            <div key={s.step} className="text-center">
              <div className="text-4xl mb-4">{s.icon}</div>
              <div className="inline-flex items-center justify-center bg-blue-700 text-white text-sm font-bold w-8 h-8 rounded-full mb-3">
                {s.step}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-10">
            What&apos;s Included at $99
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: '✅', title: 'Full BP-001 + Austin DSD packet prep', desc: 'Every required form for a standard Austin residential ADU permit, pre-filled by AI and reviewed by a licensed pro.' },
              { icon: '✅', title: 'Licensed local expediter assigned', desc: 'A vetted, TDLR-licensed Austin permit professional handles your file from prep through DSD submission.' },
              { icon: '✅', title: 'DSD submission on your behalf', desc: 'Your expediter submits directly to City of Austin Development Services Department. No waiting in lines.' },
              { icon: '✅', title: 'One round of corrections included', desc: 'If DSD sends a correction notice, your pro addresses it. Included in the $99 beta price.' },
              { icon: '✅', title: 'Document versioning', desc: 'All packet versions saved. You can view, download, or share any revision from your project dashboard.' },
              { icon: '✅', title: 'Milestone escrow protection', desc: '$99 held in escrow — released only when your permit packet is submitted to DSD. Full refund if we can\'t proceed.' },
            ].map(f => (
              <div key={f.title} className="flex gap-4 bg-white p-5 rounded-xl border border-gray-100">
                <div className="text-xl">{f.icon}</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-gray-600 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing comparison */}
      <section className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Beta vs. Regular Pricing</h2>
        <p className="text-gray-500 mb-8">Claim your spot before beta ends</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="border-2 border-blue-700 rounded-2xl p-6 bg-blue-50">
            <div className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-3">BETA — LIMITED</div>
            <div className="text-5xl font-extrabold text-blue-700 mb-1">$99</div>
            <p className="text-gray-600 text-sm mb-4">All features · {spotsLeft} spots left</p>
            <Link
              href={ctaUrl}
              className="block w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl transition-all text-sm"
              onClick={() => gtagConversion('request_intent_submit')}
            >
              Claim Beta Spot →
            </Link>
          </div>
          <div className="border border-gray-200 rounded-2xl p-6 bg-gray-50 opacity-75">
            <div className="text-gray-400 text-xs font-bold px-3 py-1 rounded-full inline-block mb-3 border border-gray-200">REGULAR PRICE</div>
            <div className="text-5xl font-extrabold text-gray-400 mb-1">$199</div>
            <p className="text-gray-400 text-sm mb-4">All features · No limit</p>
            <div className="block w-full border border-gray-200 text-gray-400 font-bold py-3 rounded-xl text-sm text-center">
              Coming Soon
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-orange-500 text-white px-6 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-2">Only {spotsLeft} Beta Spots Remaining</h2>
          <p className="text-orange-100 mb-8 text-lg">
            Lock in $99 before beta ends. Applied 100% to your final permit fee.
          </p>
          <Link
            href={ctaUrl}
            className="inline-block bg-white hover:bg-orange-50 text-orange-600 font-bold text-xl px-12 py-5 rounded-xl shadow-xl transition-all"
            onClick={() => gtagConversion('request_intent_submit')}
          >
            Claim My $99 Spot Now →
          </Link>
          <div className="flex justify-center gap-8 mt-6 text-orange-100 text-sm">
            <span>✓ Applied to permit fee</span>
            <span>✓ Escrow protected</span>
            <span>✓ Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Questions About Beta Pricing</h2>
        <div className="space-y-4">
          {[
            { q: 'What happens after beta ends?', a: 'The price goes to $199. Beta customers are locked in at $99 for their first project, even for future projects if they start during the beta period.' },
            { q: 'Is $99 a deposit or the full price?', a: '$99 is the full beta price for AI packet prep + a licensed expediter\'s DSD submission service. Typical Austin permit expediting firms charge $1,500–$3,000 for the same service. We\'re beta testing the market.' },
            { q: 'What if DSD rejects my permit?', a: 'One round of corrections is included. If DSD requires a second round or the project can\'t proceed due to zoning, you get a full refund of the $99.' },
            { q: 'How long does it take?', a: 'Your permit packet is ready within 5 business days. DSD review after submission is 4–8 weeks for express permits — that\'s Austin\'s timeline, not ours.' },
            { q: 'What Austin zones do you cover?', a: 'SF-3, SF-2, SF-4A, SF-6, and most residential zones in Austin, Cedar Park, Round Rock, and Pflugerville. Our AI is trained on Austin\'s Land Development Code.' },
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
