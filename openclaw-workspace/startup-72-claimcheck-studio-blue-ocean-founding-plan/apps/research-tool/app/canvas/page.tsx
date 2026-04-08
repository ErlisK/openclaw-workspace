// Strategy Canvas page - renders the full 38×22 canvas as a heatmap table
// Data sourced from competing-factors.json baked in at build time

const FACTORS_SHORT = [
  { id: 'claim_extraction_quality', label: 'Claim Extract' },
  { id: 'evidence_search_depth', label: 'Evidence Depth' },
  { id: 'citation_accuracy', label: 'Citation Acc.' },
  { id: 'source_credibility_scoring', label: 'Credibility' },
  { id: 'provenance_confidence_scoring', label: 'Provenance' },
  { id: 'paywall_access_handling', label: 'Paywall' },
  { id: 'hallucination_risk_mitigation', label: 'Anti-Halluc.' },
  { id: 'output_format_variety', label: 'Output Fmts' },
  { id: 'tone_literacy_adaptation', label: 'Literacy Adapt' },
  { id: 'compliance_regulatory_tools', label: 'Compliance' },
  { id: 'peer_review_human_oversight', label: 'Peer Review' },
  { id: 'audit_trail', label: 'Audit Trail' },
  { id: 'citation_bundle_export', label: 'Cite Bundle' },
  { id: 'cms_integration', label: 'CMS Integ.' },
  { id: 'api_access', label: 'API' },
  { id: 'team_collaboration', label: 'Team Collab' },
  { id: 'brand_voice_customization', label: 'Brand Voice' },
  { id: 'real_time_evidence_updates', label: 'Live Updates' },
  { id: 'pricing_accessibility', label: 'Pricing' },
  { id: 'onboarding_ease', label: 'Onboarding' },
  { id: 'enterprise_sla_support', label: 'Enterprise SLA' },
  { id: 'microtask_community_features', label: 'Microtask Mkt' },
]

const SCORES: Record<string, Record<string, number>> = {
  claimcheck_studio:  { claim_extraction_quality:5,evidence_search_depth:5,citation_accuracy:5,source_credibility_scoring:5,provenance_confidence_scoring:5,paywall_access_handling:4,hallucination_risk_mitigation:5,output_format_variety:5,tone_literacy_adaptation:5,compliance_regulatory_tools:4,peer_review_human_oversight:5,audit_trail:5,citation_bundle_export:5,cms_integration:4,api_access:4,team_collaboration:4,brand_voice_customization:3,real_time_evidence_updates:4,pricing_accessibility:4,onboarding_ease:4,enterprise_sla_support:4,microtask_community_features:5 },
  jasper:             { claim_extraction_quality:1,evidence_search_depth:1,citation_accuracy:1,source_credibility_scoring:1,provenance_confidence_scoring:1,paywall_access_handling:1,hallucination_risk_mitigation:1,output_format_variety:5,tone_literacy_adaptation:4,compliance_regulatory_tools:1,peer_review_human_oversight:1,audit_trail:2,citation_bundle_export:1,cms_integration:4,api_access:3,team_collaboration:4,brand_voice_customization:5,real_time_evidence_updates:1,pricing_accessibility:3,onboarding_ease:5,enterprise_sla_support:3,microtask_community_features:1 },
  copy_ai:            { claim_extraction_quality:1,evidence_search_depth:1,citation_accuracy:1,source_credibility_scoring:1,provenance_confidence_scoring:1,paywall_access_handling:1,hallucination_risk_mitigation:1,output_format_variety:5,tone_literacy_adaptation:4,compliance_regulatory_tools:1,peer_review_human_oversight:1,audit_trail:2,citation_bundle_export:1,cms_integration:4,api_access:3,team_collaboration:4,brand_voice_customization:4,real_time_evidence_updates:1,pricing_accessibility:2,onboarding_ease:5,enterprise_sla_support:3,microtask_community_features:1 },
  writesonic:         { claim_extraction_quality:1,evidence_search_depth:2,citation_accuracy:1,source_credibility_scoring:1,provenance_confidence_scoring:1,paywall_access_handling:1,hallucination_risk_mitigation:1,output_format_variety:3,tone_literacy_adaptation:4,compliance_regulatory_tools:1,peer_review_human_oversight:1,audit_trail:1,citation_bundle_export:1,cms_integration:3,api_access:3,team_collaboration:3,brand_voice_customization:3,real_time_evidence_updates:1,pricing_accessibility:5,onboarding_ease:5,enterprise_sla_support:2,microtask_community_features:1 },
  anyword:            { claim_extraction_quality:1,evidence_search_depth:1,citation_accuracy:1,source_credibility_scoring:1,provenance_confidence_scoring:1,paywall_access_handling:1,hallucination_risk_mitigation:1,output_format_variety:4,tone_literacy_adaptation:4,compliance_regulatory_tools:1,peer_review_human_oversight:1,audit_trail:2,citation_bundle_export:1,cms_integration:3,api_access:1,team_collaboration:4,brand_voice_customization:4,real_time_evidence_updates:1,pricing_accessibility:4,onboarding_ease:4,enterprise_sla_support:3,microtask_community_features:1 },
  rytr:               { claim_extraction_quality:1,evidence_search_depth:1,citation_accuracy:1,source_credibility_scoring:1,provenance_confidence_scoring:1,paywall_access_handling:1,hallucination_risk_mitigation:1,output_format_variety:4,tone_literacy_adaptation:3,compliance_regulatory_tools:1,peer_review_human_oversight:1,audit_trail:1,citation_bundle_export:1,cms_integration:2,api_access:2,team_collaboration:2,brand_voice_customization:2,real_time_evidence_updates:1,pricing_accessibility:5,onboarding_ease:5,enterprise_sla_support:1,microtask_community_features:1 },
  openai_chatgpt:     { claim_extraction_quality:2,evidence_search_depth:2,citation_accuracy:1,source_credibility_scoring:1,provenance_confidence_scoring:1,paywall_access_handling:1,hallucination_risk_mitigation:1,output_format_variety:5,tone_literacy_adaptation:5,compliance_regulatory_tools:1,peer_review_human_oversight:1,audit_trail:1,citation_bundle_export:1,cms_integration:2,api_access:5,team_collaboration:3,brand_voice_customization:3,real_time_evidence_updates:1,pricing_accessibility:5,onboarding_ease:5,enterprise_sla_support:3,microtask_community_features:1 },
  consensus:          { claim_extraction_quality:3,evidence_search_depth:5,citation_accuracy:4,source_credibility_scoring:4,provenance_confidence_scoring:4,paywall_access_handling:3,hallucination_risk_mitigation:4,output_format_variety:1,tone_literacy_adaptation:1,compliance_regulatory_tools:1,peer_review_human_oversight:1,audit_trail:1,citation_bundle_export:2,cms_integration:1,api_access:2,team_collaboration:2,brand_voice_customization:1,real_time_evidence_updates:3,pricing_accessibility:5,onboarding_ease:4,enterprise_sla_support:2,microtask_community_features:1 },
  elicit:             { claim_extraction_quality:3,evidence_search_depth:5,citation_accuracy:4,source_credibility_scoring:3,provenance_confidence_scoring:3,paywall_access_handling:3,hallucination_risk_mitigation:4,output_format_variety:1,tone_literacy_adaptation:1,compliance_regulatory_tools:1,peer_review_human_oversight:1,audit_trail:1,citation_bundle_export:3,cms_integration:1,api_access:3,team_collaboration:2,brand_voice_customization:1,real_time_evidence_updates:2,pricing_accessibility:4,onboarding_ease:4,enterprise_sla_support:3,microtask_community_features:1 },
  perplexity:         { claim_extraction_quality:2,evidence_search_depth:3,citation_accuracy:3,source_credibility_scoring:2,provenance_confidence_scoring:2,paywall_access_handling:2,hallucination_risk_mitigation:3,output_format_variety:3,tone_literacy_adaptation:3,compliance_regulatory_tools:1,peer_review_human_oversight:1,audit_trail:1,citation_bundle_export:1,cms_integration:1,api_access:4,team_collaboration:2,brand_voice_customization:1,real_time_evidence_updates:4,pricing_accessibility:5,onboarding_ease:5,enterprise_sla_support:2,microtask_community_features:1 },
  scite:              { claim_extraction_quality:4,evidence_search_depth:5,citation_accuracy:5,source_credibility_scoring:5,provenance_confidence_scoring:5,paywall_access_handling:3,hallucination_risk_mitigation:4,output_format_variety:1,tone_literacy_adaptation:1,compliance_regulatory_tools:1,peer_review_human_oversight:1,audit_trail:2,citation_bundle_export:3,cms_integration:1,api_access:3,team_collaboration:2,brand_voice_customization:1,real_time_evidence_updates:4,pricing_accessibility:4,onboarding_ease:4,enterprise_sla_support:3,microtask_community_features:1 },
  zotero:             { claim_extraction_quality:1,evidence_search_depth:3,citation_accuracy:5,source_credibility_scoring:2,provenance_confidence_scoring:1,paywall_access_handling:3,hallucination_risk_mitigation:1,output_format_variety:1,tone_literacy_adaptation:1,compliance_regulatory_tools:1,peer_review_human_oversight:1,audit_trail:1,citation_bundle_export:4,cms_integration:2,api_access:3,team_collaboration:4,brand_voice_customization:1,real_time_evidence_updates:2,pricing_accessibility:5,onboarding_ease:3,enterprise_sla_support:1,microtask_community_features:1 },
  paperpile:          { claim_extraction_quality:1,evidence_search_depth:3,citation_accuracy:5,source_credibility_scoring:2,provenance_confidence_scoring:1,paywall_access_handling:4,hallucination_risk_mitigation:1,output_format_variety:1,tone_literacy_adaptation:1,compliance_regulatory_tools:1,peer_review_human_oversight:1,audit_trail:1,citation_bundle_export:4,cms_integration:3,api_access:3,team_collaboration:4,brand_voice_customization:1,real_time_evidence_updates:2,pricing_accessibility:5,onboarding_ease:4,enterprise_sla_support:2,microtask_community_features:1 },
  buffer:             { claim_extraction_quality:1,evidence_search_depth:1,citation_accuracy:1,source_credibility_scoring:1,provenance_confidence_scoring:1,paywall_access_handling:1,hallucination_risk_mitigation:1,output_format_variety:4,tone_literacy_adaptation:2,compliance_regulatory_tools:1,peer_review_human_oversight:1,audit_trail:2,citation_bundle_export:1,cms_integration:3,api_access:4,team_collaboration:4,brand_voice_customization:2,real_time_evidence_updates:1,pricing_accessibility:5,onboarding_ease:5,enterprise_sla_support:2,microtask_community_features:1 },
  hootsuite:          { claim_extraction_quality:1,evidence_search_depth:1,citation_accuracy:1,source_credibility_scoring:1,provenance_confidence_scoring:1,paywall_access_handling:1,hallucination_risk_mitigation:1,output_format_variety:4,tone_literacy_adaptation:3,compliance_regulatory_tools:2,peer_review_human_oversight:2,audit_trail:3,citation_bundle_export:1,cms_integration:4,api_access:4,team_collaboration:5,brand_voice_customization:3,real_time_evidence_updates:1,pricing_accessibility:2,onboarding_ease:4,enterprise_sla_support:4,microtask_community_features:1 },
  veeva_promomats:    { claim_extraction_quality:3,evidence_search_depth:3,citation_accuracy:4,source_credibility_scoring:3,provenance_confidence_scoring:4,paywall_access_handling:3,hallucination_risk_mitigation:4,output_format_variety:2,tone_literacy_adaptation:2,compliance_regulatory_tools:5,peer_review_human_oversight:5,audit_trail:5,citation_bundle_export:4,cms_integration:4,api_access:3,team_collaboration:5,brand_voice_customization:3,real_time_evidence_updates:3,pricing_accessibility:1,onboarding_ease:1,enterprise_sla_support:5,microtask_community_features:2 },
  kudos:              { claim_extraction_quality:1,evidence_search_depth:1,citation_accuracy:3,source_credibility_scoring:2,provenance_confidence_scoring:1,paywall_access_handling:2,hallucination_risk_mitigation:2,output_format_variety:3,tone_literacy_adaptation:4,compliance_regulatory_tools:1,peer_review_human_oversight:2,audit_trail:1,citation_bundle_export:2,cms_integration:2,api_access:2,team_collaboration:3,brand_voice_customization:2,real_time_evidence_updates:2,pricing_accessibility:4,onboarding_ease:4,enterprise_sla_support:2,microtask_community_features:1 },
}

function scoreColor(s: number): string {
  if (s >= 5) return 'bg-emerald-600 text-white'
  if (s >= 4) return 'bg-emerald-800/60 text-emerald-200'
  if (s >= 3) return 'bg-blue-900/60 text-blue-200'
  if (s >= 2) return 'bg-gray-700 text-gray-300'
  return 'bg-gray-900 text-gray-600'
}

const COMPETITOR_LABELS: Record<string, string> = {
  claimcheck_studio: '★ ClaimCheck',
  jasper: 'Jasper',
  copy_ai: 'Copy.ai',
  writesonic: 'Writesonic',
  anyword: 'Anyword',
  rytr: 'Rytr',
  openai_chatgpt: 'ChatGPT',
  consensus: 'Consensus',
  elicit: 'Elicit',
  perplexity: 'Perplexity',
  scite: 'Scite',
  zotero: 'Zotero',
  paperpile: 'Paperpile',
  buffer: 'Buffer',
  hootsuite: 'Hootsuite',
  veeva_promomats: 'Veeva PromoMats',
  kudos: 'Kudos',
}

export default function CanvasPage() {
  const competitors = Object.keys(SCORES)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Strategy Canvas</h1>
        <p className="text-gray-400 text-sm mt-1">
          17 key competitors × 22 factors · Heat map shows relative scores (1–5) · ★ = ClaimCheck Studio target
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs flex-wrap">
        {[5, 4, 3, 2, 1].map(s => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-5 h-5 rounded flex items-center justify-center font-mono text-xs ${scoreColor(s)}`}>{s}</div>
            <span className="text-gray-500">{s === 5 ? 'Best-in-class' : s === 4 ? 'Strong' : s === 3 ? 'Moderate' : s === 2 ? 'Weak' : 'Absent'}</span>
          </div>
        ))}
        <span className="text-gray-600 ml-2">· Green line = ClaimCheck target</span>
      </div>

      {/* Canvas table */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="text-xs border-collapse w-full">
          <thead>
            <tr>
              <th className="sticky left-0 bg-gray-900 text-gray-400 font-medium px-3 py-2 text-left border-b border-gray-800 w-36">Competitor</th>
              {FACTORS_SHORT.map(f => (
                <th
                  key={f.id}
                  className="bg-gray-900 text-gray-500 font-normal px-1.5 py-2 border-b border-gray-800 whitespace-nowrap"
                  style={{ writingMode: 'vertical-rl', minWidth: 28, maxWidth: 28 }}
                >
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {competitors.map((comp, ri) => {
              const isTarget = comp === 'claimcheck_studio'
              const row = SCORES[comp]
              return (
                <tr key={comp} className={isTarget ? 'bg-blue-950/40' : ri % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900/40'}>
                  <td className={`sticky left-0 px-3 py-1.5 font-medium border-b border-gray-800/50 whitespace-nowrap ${isTarget ? 'bg-blue-950/60 text-blue-300' : 'bg-gray-900 text-gray-300'}`}>
                    {COMPETITOR_LABELS[comp] ?? comp}
                  </td>
                  {FACTORS_SHORT.map(f => {
                    const s = row?.[f.id] ?? 0
                    return (
                      <td key={f.id} className="p-0.5 border-b border-gray-800/30">
                        <div className={`w-6 h-6 rounded flex items-center justify-center font-mono ${scoreColor(s)} ${isTarget ? 'ring-1 ring-blue-400/30' : ''}`}>
                          {s || '–'}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Blue Ocean Insight */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 md:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-2">Key Insight: The Bifurcated Market</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            <strong className="text-blue-300">Left cluster</strong> (Jasper, Copy.ai, ChatGPT, Buffer): Score 4–5 on output variety and ease,
            but 1–2 on all evidence factors. <strong className="text-amber-300">Right cluster</strong> (Scite, Elicit, Consensus):
            Score 4–5 on evidence depth and credibility, but 1 on output formats and tone adaptation.
            <br /><br />
            <strong className="text-emerald-300">★ ClaimCheck Studio</strong> targets the completely unoccupied upper-right quadrant:
            maximum scores on both sides simultaneously — the only tool designed to bridge the gap.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-700/30 bg-emerald-950/20 p-4">
          <h3 className="text-sm font-semibold text-emerald-300 mb-2">ClaimCheck Avg Target</h3>
          <div className="text-4xl font-bold text-emerald-400 mb-1">
            {(Object.values(SCORES['claimcheck_studio']).reduce((a, b) => a + b, 0) / FACTORS_SHORT.length).toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">out of 5.0</div>
          <div className="mt-3 text-xs text-gray-500">
            Nearest competitor: Veeva PromoMats ({(Object.values(SCORES['veeva_promomats']).reduce((a, b) => a + b, 0) / FACTORS_SHORT.length).toFixed(1)})
          </div>
        </div>
      </div>
    </div>
  )
}
