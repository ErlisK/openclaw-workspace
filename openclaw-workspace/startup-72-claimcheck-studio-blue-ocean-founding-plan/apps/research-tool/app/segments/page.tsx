export default function SegmentsPage() {
  const segments = [
    {
      id: 'A',
      name: 'Medical Device & Biotech Marketing',
      tier: '1A',
      tierColor: 'border-emerald-500 bg-emerald-950/20',
      badge: 'Start now',
      badgeColor: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/30',
      size: '~5,000 companies with dedicated content staff',
      wtp: '$149-1,500/mo',
      salesCycle: '1-2 weeks',
      arrPotential: '$240k Yr1',
      painAcuity: 5,
      compliance: 'FDA 21 CFR / FTC -- legally required',
      icp: 'Head of Marketing, Content Marketing Manager, Scientific Communications Lead at Series A-D biotech or Class II/III medical device company (20-500 employees)',
      pain: 'Biotech/medtech content must cite clinical data. Manual process: PubMed search + Word + 3-day regulatory review cycle per piece. Team operates at startup velocity under pharma-adjacent legal constraints.',
      hook: 'We\'re building a tool that turns your manuscript or clinical data summary into cited LinkedIn posts and white papers in 10 minutes. Would you spend 20 minutes telling us if we\'re solving the right problem?',
      channel: 'LinkedIn DM + cold email (Content Marketing + biotech keywords)',
      interviews: [
        { ref: 'SY-013', quote: 'We produce 4 white papers and 20 LinkedIn posts per month. Every single one goes through a 3-day regulatory review cycle because nobody trusts our citations.' },
        { ref: 'SY-008', quote: 'Our marketing team wants to move fast. My team needs to slow them down to check every claim.' },
      ],
      tools: 'PubMed + Google Docs + HubSpot; sometimes Veeva or Zinc (rarely)',
      pilotTier: 'Agency $499/mo or Professional $149/mo',
    },
    {
      id: 'B',
      name: 'Medical Education (Med-Ed) Agencies',
      tier: '1A',
      tierColor: 'border-amber-500 bg-amber-950/20',
      badge: 'Start now -- AMWA Oct 2025',
      badgeColor: 'bg-amber-900/50 text-amber-300 border-amber-700/30',
      size: '~800 mid-size agencies (5-50 staff) in US/EU',
      wtp: '$499-5,000/mo',
      salesCycle: '1-3 weeks',
      arrPotential: '$240k Yr1',
      painAcuity: 5,
      compliance: 'MLR review standard -- compliance IS the product',
      icp: 'Managing Director, Senior Medical Writer, Editorial Director at independent med-ed agency producing pharma/device-commissioned content',
      pain: 'Medical writers spend 25-40% of time on citation finding and verification -- the most expensive resource doing the least value-added work. No Veeva-equivalent at SMB price.',
      hook: 'We\'re building a tool that reduces citation research time for medical writers by 60-70%. Would you pilot it on one project and tell us if it works?',
      channel: 'AMWA LinkedIn group, ISMPP member directory, cold email to agency principals',
      interviews: [
        { ref: 'SY-003', quote: '300-row Excel spreadsheet as our reference log. If one gets retracted, we have no system to catch it.' },
        { ref: 'SY-004', quote: 'Veeva is a no. We\'re a 12-person agency. We need something we can actually afford.' },
        { ref: 'SY-007', quote: 'Our medical writers are PhDs doing PubMed searches. It\'s like using a scalpel to dig a trench.' },
      ],
      tools: 'Word + PubMed + Endnote/Zotero + Excel reference logs; sometimes custom SharePoint MLR',
      pilotTier: 'Agency $499/mo (unlimited sessions, 20 seats)',
    },
    {
      id: 'C',
      name: 'Academic Research Communications (AI-Avoidant)',
      tier: '1B',
      tierColor: 'border-blue-500 bg-blue-950/20',
      badge: 'Start now -- fastest sales cycle',
      badgeColor: 'bg-blue-900/50 text-blue-300 border-blue-700/30',
      size: '~200 R1 universities (US) + ~400 globally; ~2,000 comms staff',
      wtp: '$29-149/mo individual; $299-999/mo team',
      salesCycle: '1 week (credit card)',
      arrPotential: '$87k Yr1',
      painAcuity: 4,
      compliance: 'Institutional AI restriction policies -- hallucination risk unacceptable',
      icp: 'Research Communications Officer, Science Writer, Press Office Manager at R1 research university, national lab, or major research funding body',
      pain: 'Institution has banned/restricted AI tools (hallucination risk). Manual science writing takes 6-8 hours per story. They need a trustworthy, evidence-grounded workflow -- not "another AI writer."',
      hook: 'We know your institution has AI restrictions. ClaimCheck Studio is different -- every output traces back to a PubMed source. Can we show you a 10-minute demo?',
      channel: 'Direct email to university press offices, NASW community, LinkedIn',
      interviews: [
        { ref: 'SY-006', quote: 'Our comms office got a memo from the provost: no AI-generated content for science news. But I\'m still spending 6 hours writing a 400-word story.' },
        { ref: 'SY-012', quote: 'We want evidence-backed content. We don\'t want AI writing. Can it do both?' },
      ],
      tools: 'Manual (interview + PubMed + Word); sometimes Scite or Semantic Scholar for context',
      pilotTier: 'Researcher $29/mo or Professional $149/mo',
    },
  ]

  const tier2 = [
    { name: 'Independent pharma content consultants', reason: 'High WTP but longer sales cycle; needs Agency features complete', unlock: 'Month 3' },
    { name: 'Health insurance / payer content teams', reason: 'Procurement cycle 60-90 days; not suitable for rapid demand test', unlock: 'Month 4' },
    { name: 'Large pharma enterprise (Veeva displacement)', reason: '6-12 month sales cycle; requires SOC2; premature before MVP stable', unlock: 'Month 6+' },
    { name: 'Patient advocacy organizations', reason: 'Low WTP; needs freemium tier; right for brand/press but not revenue', unlock: 'Month 6+' },
    { name: 'Health tech / digital health startups', reason: 'Different FDA framework (LDT/SaMD); needs separate compliance rule pack', unlock: 'Month 5' },
  ]

  const discoveryScript = [
    { q: 'Walk me through the last time you published a piece of science content. What did the citation/evidence process look like?', listen: 'Time spent, tools used, approval steps, frustration points' },
    { q: 'What would go wrong if a claim in your content turned out to be unsupported or retracted?', listen: 'Compliance stakes, reputational stakes, personal accountability' },
    { q: 'Have you tried using AI tools (ChatGPT, Jasper, etc.) for this workflow? What happened?', listen: 'Hallucination experience, compliance blocks, distrust signals' },
    { q: 'If you could get a first evidence-grounded draft in 10 minutes instead of [X hours], what would you do with that time?', listen: 'Volume increase, quality improvement, team leverage signals' },
    { q: 'If a tool did exactly what I just described, what would you expect to pay per month?', listen: 'WTP anchor, budget owner, approval process' },
  ]

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Demand-Testing Segments</h1>
        <p className="text-gray-400 text-sm mt-1">
          3 Tier 1 segments selected for initial outreach &middot; 30-day sprint &middot; Target: &ge;3 paid pilots
        </p>
      </div>

      {/* Recommended order */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Recommended Starting Order</div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="rounded-lg border border-amber-600 bg-amber-950/20 px-3 py-2 text-amber-300 font-medium">B &mdash; Med-Ed Agencies</div>
          <span className="text-gray-600">&rarr;</span>
          <div className="rounded-lg border border-blue-600 bg-blue-950/20 px-3 py-2 text-blue-300 font-medium">C &mdash; Academic Comms</div>
          <span className="text-gray-600">&rarr;</span>
          <div className="rounded-lg border border-emerald-600 bg-emerald-950/20 px-3 py-2 text-emerald-300 font-medium">A &mdash; Biotech/MedDevice</div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          B first: AMWA Annual Conference October 2025 &mdash; 5 months to build pipeline. C has fastest sales cycle (credit card, no PO). A has highest ARR potential but needs Compliance Flag feature (Story S6) working first.
        </p>
      </div>

      {/* Segment cards */}
      <div className="space-y-6">
        {segments.map((s) => (
          <div key={s.id} className={`rounded-xl border-2 ${s.tierColor} p-6`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-white">Segment {s.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${s.badgeColor}`}>{s.badge}</span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">{s.name}</h2>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-emerald-400">{s.wtp}</div>
                <div className="text-xs text-gray-500">WTP range &middot; {s.arrPotential}</div>
                <div className="text-xs text-gray-600 mt-1">Sales cycle: {s.salesCycle}</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">ICP Profile</div>
                <p className="text-xs text-gray-400 leading-relaxed">{s.icp}</p>
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Core Pain</div>
                <p className="text-xs text-gray-400 leading-relaxed">{s.pain}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Market Size</div>
                <p className="text-xs text-gray-400">{s.size}</p>
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Compliance Driver</div>
                <p className="text-xs text-gray-400">{s.compliance}</p>
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Current Tools</div>
                <p className="text-xs text-gray-400">{s.tools}</p>
              </div>
            </div>

            {/* Outreach hook */}
            <div className="border border-gray-700 rounded-lg p-3 mb-4 bg-gray-900/50">
              <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Outreach Hook</div>
              <p className="text-xs text-gray-300 italic leading-relaxed">&ldquo;{s.hook}&rdquo;</p>
              <div className="text-xs text-gray-500 mt-1">Channel: {s.channel}</div>
            </div>

            {/* Interview evidence */}
            <div className="space-y-2">
              <div className="text-xs text-gray-600 uppercase tracking-wider">Supporting Interview Evidence</div>
              {s.interviews.map((iv, i) => (
                <blockquote key={i} className="border-l-2 border-gray-700 pl-3 text-xs text-gray-400 italic">
                  <span className="text-gray-600 not-italic mr-1">{iv.ref}:</span>&ldquo;{iv.quote}&rdquo;
                </blockquote>
              ))}
            </div>

            <div className="mt-3 text-xs text-gray-600 pt-3 border-t border-gray-800">
              <span className="text-gray-500">Pilot offer: </span>{s.pilotTier}
            </div>
          </div>
        ))}
      </div>

      {/* Comparison matrix */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Segment Comparison Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 px-3 text-gray-400 font-medium">Criterion</th>
                <th className="text-center py-2 px-3 text-emerald-400 font-medium">A: Biotech/MedDevice</th>
                <th className="text-center py-2 px-3 text-amber-400 font-medium">B: Med-Ed Agencies</th>
                <th className="text-center py-2 px-3 text-blue-400 font-medium">C: Academic Comms</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Pain acuity', '5/5 (legally required)', '5/5 (billable quality)', '4/5 (reputational risk)'],
                ['WTP/month', '$149-1,500', '$499-5,000', '$29-149'],
                ['Sales cycle', '1-2 weeks', '1-3 weeks', '1 week (credit card)'],
                ['Reachability', 'LinkedIn (medium)', 'AMWA/ISMPP (high)', 'University directories (high)'],
                ['Compliance forcing', 'FDA/FTC required', 'MLR standard', 'AI restriction policy'],
                ['Docs/month volume', '10-50', '50-200', '5-20'],
                ['Reference value', 'High', 'Very high', 'Very high'],
                ['ARR potential Yr1', '$240k', '$240k', '$87k'],
                ['Priority', '1A -- start now', '1A -- start now', '1B -- start now'],
              ].map(([criterion, a, b, c], i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-950/50' : ''}>
                  <td className="py-2 px-3 text-gray-400 font-medium">{criterion}</td>
                  <td className="py-2 px-3 text-center text-gray-400">{a}</td>
                  <td className="py-2 px-3 text-center text-gray-400">{b}</td>
                  <td className="py-2 px-3 text-center text-gray-400">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discovery call script */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Discovery Call Script (5 Questions)</h3>
        <div className="space-y-3">
          {discoveryScript.map((q, i) => (
            <div key={i} className="border border-gray-800 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <span className="text-gray-600 font-mono shrink-0 text-xs">{i + 1}.</span>
                <div>
                  <p className="text-xs text-gray-300 italic leading-relaxed mb-1">&ldquo;{q.q}&rdquo;</p>
                  <p className="text-xs text-gray-600"><span className="text-gray-500">Listen for:</span> {q.listen}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tier 2 */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Tier 2 Segments &mdash; Next 90-Day Cohort</h2>
        <p className="text-gray-500 text-sm mb-4">Do not start outreach yet. Unlock conditions must be met first.</p>
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-900 border-b border-gray-800">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Segment</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Why Tier 2</th>
                <th className="text-center px-4 py-3 text-gray-400 font-medium w-24">Unlock</th>
              </tr>
            </thead>
            <tbody>
              {tier2.map(({ name, reason, unlock }, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900/40'}>
                  <td className="px-4 py-2.5 text-gray-300">{name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{reason}</td>
                  <td className="px-4 py-2.5 text-center text-amber-500 font-mono">{unlock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Success metrics */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="text-sm font-semibold text-white mb-3">30-Day Sprint Success Metrics</h3>
        <div className="grid md:grid-cols-3 gap-4 text-xs">
          {[
            { metric: 'Discovery calls completed', target: '>=20', method: 'Calendar + Supabase log' },
            { metric: 'Calls per segment', target: '>=6 per segment', method: 'Supabase segment filter' },
            { metric: 'Paid pilots started', target: '>=3', method: 'Stripe payment confirmation' },
            { metric: 'WTP data points collected', target: '>=15', method: 'Discovery call notes' },
            { metric: 'Segment ranking completed', target: 'By Day 30', method: 'Scoring rubric' },
            { metric: 'Top-priority segment selected', target: '1 segment', method: 'Team decision' },
          ].map(({ metric, target, method }, i) => (
            <div key={i} className="border border-gray-700 rounded-lg p-3">
              <div className="font-medium text-gray-300 mb-1">{metric}</div>
              <div className="text-emerald-400 font-bold mb-1">{target}</div>
              <div className="text-gray-600">{method}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
