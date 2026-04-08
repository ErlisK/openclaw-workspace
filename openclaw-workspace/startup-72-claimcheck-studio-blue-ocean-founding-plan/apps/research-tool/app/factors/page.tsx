import { supabase } from '@/lib/supabase'

const WEIGHT_COLORS: Record<string, string> = {
  critical: 'bg-red-900/40 text-red-300 border-red-700/40',
  high:     'bg-amber-900/40 text-amber-300 border-amber-700/40',
  medium:   'bg-blue-900/40 text-blue-300 border-blue-700/40',
}

function ScoreBar({ score, max = 5, target }: { score: number; max?: number; target?: number }) {
  const pct = (score / max) * 100
  const tpct = target ? (target / max) * 100 : null
  return (
    <div className="relative h-2 rounded-full bg-gray-800 w-full">
      <div
        className="absolute h-2 rounded-full bg-blue-600 transition-all"
        style={{ width: `${pct}%` }}
      />
      {tpct && (
        <div
          className="absolute top-0 h-2 w-0.5 bg-emerald-400"
          style={{ left: `${tpct}%` }}
          title={`ClaimCheck target: ${target}`}
        />
      )}
    </div>
  )
}

export default async function FactorsPage() {
  const { data: factors } = await supabase
    .from('claimcheck_factors')
    .select('*')
    .order('weight', { ascending: false })
    .order('name')

  const { data: scores } = await supabase
    .from('claimcheck_scores')
    .select('factor_id, score, competitor_id')

  // Compute avg industry score per factor
  const factorScoreMap: Record<string, number[]> = {}
  scores?.forEach(({ factor_id, score }) => {
    if (!factorScoreMap[factor_id]) factorScoreMap[factor_id] = []
    factorScoreMap[factor_id].push(score)
  })

  const avgForFactor = (id: string) => {
    const arr = factorScoreMap[id]
    if (!arr?.length) return null
    return arr.reduce((a, b) => a + b, 0) / arr.length
  }

  // Static full factor list (22 factors)
  const STATIC_FACTORS = [
    { id: 'claim_extraction_quality', name: 'Claim Extraction Quality', description: 'Ability to identify and extract discrete factual claims from input documents', weight: 'critical', claimcheck_target_score: 5 },
    { id: 'evidence_search_depth', name: 'Evidence Search Depth', description: 'Breadth and quality of biomedical/scientific database search (PubMed/CrossRef/Scite/Unpaywall)', weight: 'critical', claimcheck_target_score: 5 },
    { id: 'citation_accuracy', name: 'Citation Accuracy', description: 'Accuracy and completeness of bibliographic citations (DOI, authors, year, journal)', weight: 'high', claimcheck_target_score: 5 },
    { id: 'source_credibility_scoring', name: 'Source Credibility Scoring', description: 'Automated scoring of source quality (journal impact, retraction status, study type)', weight: 'critical', claimcheck_target_score: 5 },
    { id: 'provenance_confidence_scoring', name: 'Provenance & Confidence Scoring', description: 'Per-claim provenance tracking showing which source supports/contradicts/mentions each claim', weight: 'critical', claimcheck_target_score: 5 },
    { id: 'paywall_access_handling', name: 'Paywall Access Handling', description: 'Ability to access full-text via Unpaywall, institutional connectors, or OA sources', weight: 'high', claimcheck_target_score: 4 },
    { id: 'hallucination_risk_mitigation', name: 'Hallucination Risk Mitigation', description: 'Active measures to detect and flag AI content lacking supporting evidence', weight: 'critical', claimcheck_target_score: 5 },
    { id: 'output_format_variety', name: 'Output Format Variety', description: 'Range of content formats generated (tweet, LinkedIn, blog, slide copy, patient FAQ)', weight: 'high', claimcheck_target_score: 5 },
    { id: 'tone_literacy_adaptation', name: 'Tone & Literacy-Level Adaptation', description: 'Ability to adjust content for different audiences (lay public, clinicians, policymakers)', weight: 'high', claimcheck_target_score: 5 },
    { id: 'compliance_regulatory_tools', name: 'Compliance / Regulatory Tools', description: 'Features for FDA/EMA guidelines, MLR review workflow, regulatory phrasing enforcement', weight: 'high', claimcheck_target_score: 4 },
    { id: 'peer_review_human_oversight', name: 'Peer Review / Human Oversight', description: 'Built-in human review workflow with expert sign-offs and microtask community', weight: 'high', claimcheck_target_score: 5 },
    { id: 'audit_trail', name: 'Audit Trail', description: 'Exportable log showing who reviewed what, when, with what source evidence', weight: 'high', claimcheck_target_score: 5 },
    { id: 'citation_bundle_export', name: 'Citation Bundle Export', description: 'Downloadable package of DOIs, plain-language summaries, excerpts, and snapshot PDFs', weight: 'high', claimcheck_target_score: 5 },
    { id: 'cms_integration', name: 'CMS Integration', description: 'Native integration with CMS platforms (WordPress, HubSpot, Contentful)', weight: 'medium', claimcheck_target_score: 4 },
    { id: 'api_access', name: 'API Access', description: 'Programmatic API for developers to integrate evidence-checking into workflows', weight: 'medium', claimcheck_target_score: 4 },
    { id: 'team_collaboration', name: 'Team Collaboration', description: 'Multi-user workspace, commenting, role management, shared libraries', weight: 'medium', claimcheck_target_score: 4 },
    { id: 'brand_voice_customization', name: 'Brand Voice Customization', description: 'Organization-specific tone, terminology, and style guide training', weight: 'medium', claimcheck_target_score: 3 },
    { id: 'real_time_evidence_updates', name: 'Real-Time Evidence Updates', description: 'Alerts when source evidence changes (retractions, new meta-analyses)', weight: 'medium', claimcheck_target_score: 4 },
    { id: 'pricing_accessibility', name: 'Pricing Accessibility', description: 'Availability of affordable plans for individual researchers and communicators', weight: 'medium', claimcheck_target_score: 4 },
    { id: 'onboarding_ease', name: 'Onboarding Ease', description: 'Time to first value: how quickly a new user gets meaningful output', weight: 'medium', claimcheck_target_score: 4 },
    { id: 'enterprise_sla_support', name: 'Enterprise SLA Support', description: 'SLAs, dedicated support, SOC2/HIPAA certifications, uptime guarantees', weight: 'medium', claimcheck_target_score: 4 },
    { id: 'microtask_community_features', name: 'Microtask Community Features', description: 'Paid expert review marketplace, reputation badges, task routing, incentive mechanisms', weight: 'medium', claimcheck_target_score: 5 },
  ]

  // Merge DB data with static data
  const factorMap = new Map((factors ?? []).map(f => [f.id, f]))
  const merged = STATIC_FACTORS.map(sf => ({ ...sf, ...(factorMap.get(sf.id) ?? {}) }))
  const critical = merged.filter(f => f.weight === 'critical')
  const high = merged.filter(f => f.weight === 'high')
  const medium = merged.filter(f => f.weight === 'medium')

  const renderGroup = (label: string, items: typeof merged) => (
    <div key={label}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${WEIGHT_COLORS[label.toLowerCase()] ?? ''}`}>
          {label} priority
        </span>
        <span className="text-gray-600 text-xs">{items.length} factors</span>
      </div>
      <div className="grid gap-3 mb-8">
        {items.map((f) => {
          const avg = avgForFactor(f.id)
          const target = f.claimcheck_target_score
          const gap = avg != null ? target - avg : null
          return (
            <div key={f.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">{f.name}</div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{f.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-bold text-blue-400">{target}<span className="text-gray-600">/5</span></div>
                  <div className="text-xs text-gray-600">target</div>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {avg != null && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-32 shrink-0">Industry avg ({avg?.toFixed(1)})</span>
                    <ScoreBar score={avg} target={target} />
                    {gap != null && gap > 2 && (
                      <span className="text-xs text-emerald-400 shrink-0">+{gap.toFixed(1)} gap</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-32 shrink-0">ClaimCheck target</span>
                  <ScoreBar score={target} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Competing Factors</h1>
        <p className="text-gray-400 text-sm mt-1">
          {STATIC_FACTORS.length} factors scored 1–5 across all competitors · Green markers show ClaimCheck Studio target scores
        </p>
      </div>
      {renderGroup('Critical', critical)}
      {renderGroup('High', high)}
      {renderGroup('Medium', medium)}
    </div>
  )
}
