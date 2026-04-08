export default function ERRCPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">ERRC Grid</h1>
        <p className="text-gray-400 text-sm mt-1">
          Eliminate · Reduce · Raise · Create — Blue Ocean Step 3 · 3 reviewer comments incorporated
        </p>
      </div>

      {/* Reviewer callout */}
      <div className="rounded-xl border border-blue-700/30 bg-blue-950/20 p-4">
        <h3 className="text-xs font-semibold text-blue-300 mb-2 uppercase tracking-wider">External Reviewer Inputs Incorporated</h3>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { reviewer: 'Reviewer 1 — MedComms Manager (Series C Biotech)', change: 'Audit trail must be primary UX surface. FDA 21 CFR Part 11 added to compliance agent spec.' },
            { reviewer: 'Reviewer 2 — Freelance Science Journalist', change: 'Audience selection moved to workflow Step 1 (not a post-gen toggle). SEO kept as opt-in by-product.' },
            { reviewer: 'Reviewer 3 — Med-Ed Agency Creative Director', change: 'Two-path onboarding: Demo mode (<10 min, no config) + Configure mode (power-user). Config is optional.' },
          ].map((r, i) => (
            <div key={i} className="text-xs text-gray-400 border border-gray-700 rounded-lg p-3">
              <div className="font-medium text-gray-300 mb-1">{r.reviewer}</div>
              <p className="text-gray-500 leading-relaxed">{r.change}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ERRC Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* ELIMINATE */}
        <div className="rounded-xl border border-red-700/30 bg-red-950/10 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🗑️</span>
            <h2 className="text-lg font-bold text-red-300">Eliminate</h2>
            <span className="text-xs text-red-400/60 ml-auto">Cost without buyer value</span>
          </div>
          <div className="space-y-3">
            {[
              { item: 'Generic brand-voice training as core differentiator', quote: '"I don\'t need it to sound like me. I need it to not be wrong." — SY-003' },
              { item: 'Vanity content metrics (engagement scores, virality predictions)', quote: '"The engagement score means nothing when my compliance team reviews it." — SY-011' },
              { item: 'General-purpose content templates (ads, sales emails, product descriptions)', quote: 'Canvas gap: high output breadth ≠ science communication quality' },
              { item: 'Long onboarding wizards / mandatory feature tours', quote: '"We tried Jasper for three weeks and never got past the brand setup." — SY-001' },
              { item: 'Black-box AI generation with no source provenance', quote: '6/15 interviews cited hallucination trust as top-3 concern' },
            ].map((r, i) => (
              <div key={i} className="border border-red-800/30 rounded-lg p-3">
                <div className="text-sm text-red-200 font-medium mb-1">{r.item}</div>
                <div className="text-xs text-red-400/70 italic">{r.quote}</div>
              </div>
            ))}
          </div>
        </div>

        {/* REDUCE */}
        <div className="rounded-xl border border-amber-700/30 bg-amber-950/10 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📉</span>
            <h2 className="text-lg font-bold text-amber-300">Reduce</h2>
            <span className="text-xs text-amber-400/60 ml-auto">Below industry standard</span>
          </div>
          <div className="space-y-3">
            {[
              { item: 'Output format breadth', from: '50–80 templates', to: '7 focused formats' },
              { item: 'Real-time collaboration', from: 'Full co-authoring editors', to: 'Async review workflow + claim comments' },
              { item: 'SEO optimization as primary goal', from: 'Core output driver', to: 'Secondary opt-in layer' },
              { item: 'Social scheduling/publishing pipelines', from: 'Deep scheduling + analytics', to: 'Single-click "prepare for publishing" handoff' },
              { item: 'Citation style variety', from: 'Dozens of styles', to: '3 styles: Vancouver, APA, Chicago' },
              { item: 'AI chat / open-ended prompting', from: 'Open prompt box', to: 'Structured workflow: upload → extract → evidence → output' },
            ].map((r, i) => (
              <div key={i} className="border border-amber-800/30 rounded-lg p-3">
                <div className="text-sm text-amber-200 font-medium mb-1">{r.item}</div>
                <div className="text-xs text-gray-500">
                  <span className="line-through text-red-400/60">{r.from}</span>
                  <span className="text-amber-500 ml-2">→ {r.to}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RAISE */}
        <div className="rounded-xl border border-blue-700/30 bg-blue-950/10 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📈</span>
            <h2 className="text-lg font-bold text-blue-300">Raise</h2>
            <span className="text-xs text-blue-400/60 ml-auto">Above industry standard</span>
          </div>
          <div className="space-y-3">
            {[
              { item: 'Evidence grounding per claim', current: 'Scite/Consensus (no per-claim in content)', target: 'Every sentence → ≥1 peer-reviewed source + confidence score' },
              { item: 'Paywall / full-text retrieval', current: 'Paperpile proxy (manual)', target: 'Automated Unpaywall → OA full text → institutional fallback; <15% failure' },
              { item: 'Compliance / regulatory phrasing enforcement', current: 'Veeva $150k+/yr only', target: 'Configurable compliance agent at $499/mo starting tier' },
              { item: 'Speed to first evidence-grounded draft', current: '2–4 days (manual research)', target: '<10 minutes from document upload' },
              { item: 'Citation bundle quality', current: 'DOI list only (citation managers)', target: 'DOIs + excerpts + plain-language summaries + retraction status + snapshot PDFs' },
              { item: 'Audit trail granularity', current: 'Veeva (claim-level, $150k) or none', target: 'Immutable per-claim log at $499/mo: who, source, score, timestamp' },
              { item: 'Pricing accessibility (non-enterprise)', current: 'Elicit $49/mo (research only, no content)', target: 'Full evidence + content workflow at $29/mo' },
            ].map((r, i) => (
              <div key={i} className="border border-blue-800/30 rounded-lg p-3">
                <div className="text-sm text-blue-200 font-medium mb-1">{r.item}</div>
                <div className="text-xs text-gray-500">
                  <span className="text-gray-600">{r.current}</span>
                  <span className="text-blue-400 ml-2">→ {r.target}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CREATE */}
        <div className="rounded-xl border border-emerald-700/30 bg-emerald-950/10 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">✨</span>
            <h2 className="text-lg font-bold text-emerald-300">Create</h2>
            <span className="text-xs text-emerald-400/60 ml-auto">Never before offered</span>
          </div>
          <div className="space-y-3">
            {[
              { item: 'Per-claim provenance scoring', desc: 'Confidence score (0–1.0) per claim: source count × recency × study type hierarchy × Scite sentiment' },
              { item: 'Vetted peer-review microcommunity', desc: 'Marketplace of PhD-level reviewers. $5–20/claim microtasks. Reputation badges. Delivery SLAs. Network-effect moat.' },
              { item: 'Compliance agent with configurable rule packs', desc: 'FDA fair balance, EMA off-label, EFSA nutrition claims. Configurable per org. Compliance attestation PDF export.' },
              { item: 'Retraction + correction alert system', desc: 'Monitor published content linked to sources that later get retracted, corrected, or superseded. Alert with re-check prompt.' },
              { item: 'Literacy-adaptive output modes', desc: 'One evidence base → 4 audiences: Patient (6th grade), Journalist (10th), Clinician (professional), Policymaker (exec summary).' },
              { item: 'CiteBundle export', desc: 'ZIP package: DOIs + formatted citations + plain-language summaries + source excerpts + retraction status + snapshot PDFs.' },
              { item: 'Institutional connector integrations', desc: 'PubMed Entrez, CrossRef, Scite, Unpaywall. Enterprise: hospital/university library connectors + on-prem pharma IP systems.' },
            ].map((r, i) => (
              <div key={i} className="border border-emerald-800/30 rounded-lg p-3">
                <div className="text-sm text-emerald-200 font-medium mb-1">{r.item}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{r.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Strategic Logic Summary */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Strategic Logic</h3>
        <div className="grid md:grid-cols-4 gap-3 text-xs">
          {[
            { action: 'ELIMINATE', why: 'Reduces cost, sharpens positioning, removes confusion for B2B buyers', color: 'text-red-400' },
            { action: 'REDUCE', why: 'Forces depth-over-breadth; makes compliance-grade workflow tractable', color: 'text-amber-400' },
            { action: 'RAISE', why: 'Directly addresses top-3 ICP pain points; creates premium pricing justification', color: 'text-blue-400' },
            { action: 'CREATE', why: 'Network effects, new category ownership, defensible moat vs. AI commoditization', color: 'text-emerald-400' },
          ].map(({ action, why, color }) => (
            <div key={action} className="border border-gray-700 rounded-lg p-3">
              <div className={`font-bold ${color} mb-1`}>{action}</div>
              <p className="text-gray-500 leading-relaxed">{why}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
