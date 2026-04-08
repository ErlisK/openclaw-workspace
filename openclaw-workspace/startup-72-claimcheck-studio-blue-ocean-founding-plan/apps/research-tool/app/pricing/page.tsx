export default function PricingPage() {
  const tiers = [
    {
      name: 'Researcher',
      price: '$29',
      period: '/month',
      annual: '$290/year (2 months free)',
      target: 'Solo researchers, science journalists, health bloggers, PhD students',
      wtp: 'SY-002: $20–40/mo · SY-005: $20–60/mo · SY-006: $30–50/mo',
      color: 'border-gray-700',
      badge: '',
      features: [
        '20 document sessions/month (≤5,000 words each)',
        'All 7 output formats',
        'PubMed + CrossRef + Unpaywall evidence search',
        'Per-claim confidence scoring',
        'CiteBundle export (CSV + BibTeX + Vancouver)',
        'Audience-adaptive output (4 levels)',
        'Audit trail (90-day retention)',
        'General health claims compliance flags (read-only)',
        '1 user seat',
      ],
      limits: '100 claims/month · No Scite · No team features · No custom compliance rules',
    },
    {
      name: 'Professional',
      price: '$149',
      period: '/month',
      annual: '$1,490/year',
      target: 'Freelance medical writers, health startup content teams (2–5), science communication consultants',
      wtp: 'SY-001: $100–300/mo · SY-005: $150–400/mo · SY-010: $99–499/mo',
      color: 'border-blue-600',
      badge: 'Most popular',
      features: [
        '100 document sessions/month · Unlimited claims/session',
        'Scite Smart Citations integration (supports/disputes/mentions)',
        'FDA + EMA compliance flag rule packs',
        'Compliance attestation report export (PDF)',
        'Audit trail (12-month retention)',
        'Up to 5 team seats',
        'Evidence preferences profile (database weights, study type hierarchy)',
        'Priority evidence search queue',
        'CiteBundle: adds source excerpts + confidence report PDF',
      ],
      limits: '',
    },
    {
      name: 'Agency',
      price: '$499',
      period: '/month',
      annual: '$4,990/year',
      target: 'Medical communications agencies (5–50 staff), health marketing agencies, med-ed content shops',
      wtp: 'SY-003: $500–2,000/mo · SY-004: $499–1,500/mo · SY-007: $500–5,000/mo',
      color: 'border-amber-600',
      badge: 'Veeva alternative',
      features: [
        'Unlimited document sessions',
        'Up to 20 team seats',
        'Custom compliance rule packs (admin-configurable)',
        'SAML SSO',
        'Peer review microtask marketplace access',
        'CiteBundle: adds snapshot PDFs',
        'Dedicated Slack support channel',
        'Retraction + correction alert monitoring',
        'White-label citation report (org logo)',
      ],
      limits: '',
    },
    {
      name: 'Enterprise',
      price: 'From $2,000',
      period: '/month',
      annual: 'Annual contract · Custom pricing',
      target: 'Mid-size pharma/biotech (200–5,000 employees), medical device, health insurance content teams',
      wtp: 'SY-008: $1,000–15,000/mo · SY-011: $2,000–8,000/mo · SY-013: $10,000–50,000/mo',
      color: 'border-red-600',
      badge: 'Veeva displacement',
      features: [
        'Unlimited seats',
        'Institutional library connector (hospital/university IP)',
        'On-premise database option',
        'FDA 21 CFR Part 11-ready audit trail',
        'SLA: 99.9% uptime · 4h support response · Dedicated CSM',
        'Custom LLM deployment (models in customer VPC)',
        'SOC 2 Type II · HIPAA BAA',
        'Quarterly evidence model updates',
        'API access (bulk processing, webhook integrations, CMS connectors)',
      ],
      limits: '',
    },
  ]

  const segments = [
    { name: 'Solo Science Communicator', tier: 'Researcher', size: '~500,000 globally', conversion: '2%', customers: '10,000', arr: '$3.5M', acquisition: 'SEO · Product Hunt · AMWA/ISMPP communities · Academic Twitter', risk: 'High churn if evidence search quality is poor' },
    { name: 'Health Startup Content Team', tier: 'Professional', size: '~15,000 companies', conversion: '3%', customers: '450', arr: '$800k', acquisition: 'YC/Founder network · Healthcare accelerators · Slack communities', risk: 'Procurement cycles even at $149/mo (4–8 weeks)' },
    { name: 'Medical Communications Agency', tier: 'Agency', size: '~800 mid-size', conversion: '5%', customers: '40', arr: '$240k', acquisition: 'AMWA conference (Oct) · ISMPP Annual Meeting (Jun) · Direct outreach', risk: 'Agencies have existing Word + PubMed + Endnote workflows; switching cost real' },
    { name: 'Pharma / Biotech', tier: 'Enterprise', size: '~500 mid-size ($100M–$5B)', conversion: '1%', customers: '5', arr: '$180k', acquisition: 'Conference BD · LinkedIn enterprise outreach · Agency tier referrals', risk: 'Long sales cycle (6–12 months); requires SOC2 before first close' },
  ]

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Pricing & Segment Hypotheses</h1>
        <p className="text-gray-400 text-sm mt-1">
          4 tiers · Hypotheses for validation · Prices to be A/B tested in beta
        </p>
      </div>

      {/* Pricing tiers */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {tiers.map((t) => (
          <div key={t.name} className={`rounded-xl border-2 ${t.color} bg-gray-900 p-5 flex flex-col`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-bold text-white text-lg">{t.name}</div>
                <div className="text-3xl font-black text-white mt-1">{t.price}<span className="text-sm font-normal text-gray-400">{t.period}</span></div>
                <div className="text-xs text-gray-500 mt-0.5">{t.annual}</div>
              </div>
              {t.badge && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-300 border border-amber-700/30">
                  {t.badge}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">{t.target}</p>
            <div className="text-xs text-gray-600 italic mb-3">WTP: {t.wtp}</div>
            <ul className="space-y-1.5 flex-1">
              {t.features.map((f, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-400">
                  <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            {t.limits && (
              <div className="mt-3 text-xs text-gray-600 border-t border-gray-800 pt-3">{t.limits}</div>
            )}
          </div>
        ))}
      </div>

      {/* Microtask marketplace */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="text-sm font-semibold text-white mb-3">💡 Peer Review Microtask Marketplace (Add-on Revenue)</h3>
        <div className="grid md:grid-cols-3 gap-4 text-xs">
          <div>
            <div className="font-medium text-gray-300 mb-2">How It Works</div>
            <ol className="space-y-1 text-gray-500 list-decimal list-inside">
              <li>User flags a claim for expert peer review</li>
              <li>System routes to verified reviewer in relevant specialty</li>
              <li>Reviewer completes within SLA: accept/reject/modify + notes</li>
              <li>User pays per-claim fee; reviewer earns 70%</li>
            </ol>
          </div>
          <div>
            <div className="font-medium text-gray-300 mb-2">Pricing</div>
            <div className="space-y-1 text-gray-500">
              <div className="flex justify-between"><span>Standard review (24h SLA)</span><span className="text-amber-400">$5/claim</span></div>
              <div className="flex justify-between"><span>Specialty review (48h SLA)</span><span className="text-amber-400">$15/claim</span></div>
              <div className="flex justify-between"><span>Urgent (6h SLA)</span><span className="text-amber-400">2× base</span></div>
              <div className="flex justify-between text-gray-600"><span>Reviewer take-rate</span><span>70%</span></div>
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-300 mb-2">Revenue Model</div>
            <p className="text-gray-500 leading-relaxed">
              1,000 reviews/month × $10 avg = $10k GMV → $3k gross margin. Network effect: more reviewers → faster SLAs → more users → more reviews → attracts more reviewers.
            </p>
          </div>
        </div>
      </div>

      {/* Year 1 revenue model */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Year 1 Revenue Model</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 px-3 text-gray-400 font-medium">Tier</th>
                <th className="text-right py-2 px-3 text-gray-400 font-medium">Target Customers</th>
                <th className="text-right py-2 px-3 text-gray-400 font-medium">MRR/Customer</th>
                <th className="text-right py-2 px-3 text-gray-400 font-medium">Yr 1 MRR</th>
              </tr>
            </thead>
            <tbody>
              {[
                { tier: 'Researcher', customers: 500, mrr: 29, total: 14500 },
                { tier: 'Professional', customers: 150, mrr: 149, total: 22350 },
                { tier: 'Agency', customers: 30, mrr: 499, total: 14970 },
                { tier: 'Enterprise', customers: 3, mrr: 3000, total: 9000 },
                { tier: 'Marketplace (GMV × 30%)', customers: null, mrr: null, total: 3000 },
              ].map(({ tier, customers, mrr, total }, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-950/50' : ''}>
                  <td className="py-2 px-3 text-gray-300">{tier}</td>
                  <td className="py-2 px-3 text-right text-gray-400 font-mono">{customers ?? '—'}</td>
                  <td className="py-2 px-3 text-right text-gray-400 font-mono">{mrr ? `$${mrr}` : '—'}</td>
                  <td className="py-2 px-3 text-right text-emerald-400 font-mono">${total.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="border-t border-gray-700">
                <td className="py-2 px-3 font-bold text-white">Total</td>
                <td className="py-2 px-3 text-right text-white font-mono">683</td>
                <td className="py-2 px-3 text-right text-gray-400">—</td>
                <td className="py-2 px-3 text-right text-emerald-300 font-bold font-mono">~$63,820/mo</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs text-gray-600 grid grid-cols-3 gap-4">
          <div><strong className="text-gray-500">Yr 1 ARR target:</strong> $766k (conservative)</div>
          <div><strong className="text-gray-500">Yr 2 ARR target:</strong> $3.2M (Agency + Enterprise)</div>
          <div><strong className="text-gray-500">Break-even:</strong> ~$35k MRR → ~120 Professional customers</div>
        </div>
      </div>

      {/* Segment hypotheses */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Segment Hypotheses</h2>
        <div className="space-y-4">
          {segments.map((s, i) => (
            <div key={i} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-semibold text-white text-sm">{s.name}</span>
                  <span className="text-xs text-gray-500 ml-2">({s.tier} tier)</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-400">{s.arr} <span className="text-xs font-normal text-gray-500">ARR</span></div>
                  <div className="text-xs text-gray-600">{s.customers} customers @ {s.conversion} conversion</div>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3 text-xs mt-2">
                <div><span className="text-gray-600">Market size:</span> <span className="text-gray-400">{s.size}</span></div>
                <div><span className="text-gray-600">Acquisition:</span> <span className="text-gray-400">{s.acquisition}</span></div>
                <div><span className="text-gray-600">Key risk:</span> <span className="text-amber-400">{s.risk}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing risks */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Pricing Risks & Mitigations</h3>
        <div className="space-y-2">
          {[
            { risk: 'Price too high for researchers', desc: '$29/mo may lose vs. free PubMed + ChatGPT', mitigation: '14-day free trial, 3 sessions; freemium tier evaluation post-beta' },
            { risk: 'Agency tier underpriced', desc: '$499/mo may be too cheap if agencies see $5k+/mo in time savings', mitigation: 'A/B test $499 vs $799 vs $999 in first 90 days; use usage analytics to find natural ceiling' },
            { risk: 'Enterprise sales cycle too long', desc: '6–12 month sales cycle before first revenue', mitigation: 'Charge for POC ($500–1k); use agency customers as references' },
            { risk: 'Marketplace cold start', desc: 'No reviewers on Day 1', mitigation: 'Manually recruit 20 vetted reviewers (LinkedIn + AMWA) before marketplace launch; subsidize first 100 reviews' },
          ].map(({ risk, desc, mitigation }, i) => (
            <div key={i} className="grid md:grid-cols-3 gap-3 border border-gray-800 rounded-lg p-3 text-xs">
              <div className="text-amber-300 font-medium">{risk}</div>
              <div className="text-gray-500">{desc}</div>
              <div className="text-emerald-400">→ {mitigation}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
