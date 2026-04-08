import { supabase } from '@/lib/supabase'

const CATEGORY_COLORS: Record<string, string> = {
  ai_copywriting:          'bg-blue-900/50 text-blue-300 border-blue-700/40',
  research_assistant:      'bg-purple-900/50 text-purple-300 border-purple-700/40',
  literature_tool:         'bg-teal-900/50 text-teal-300 border-teal-700/40',
  citation_manager:        'bg-green-900/50 text-green-300 border-green-700/40',
  social_content:          'bg-orange-900/50 text-orange-300 border-orange-700/40',
  compliance_mlr:          'bg-red-900/50 text-red-300 border-red-700/40',
  science_communication:   'bg-amber-900/50 text-amber-300 border-amber-700/40',
}

const CATEGORY_LABELS: Record<string, string> = {
  ai_copywriting:        'AI Copywriting',
  research_assistant:    'Research Assistant',
  literature_tool:       'Literature Tool',
  citation_manager:      'Citation Manager',
  social_content:        'Social / Content',
  compliance_mlr:        'Compliance / MLR',
  science_communication: 'Science Comm',
}

// Full 38-competitor dataset (from competitors.json — served statically for speed)
const ALL_COMPETITORS = [
  { id: 'jasper', name: 'Jasper', category: 'ai_copywriting', website: 'https://jasper.ai', pricing: 'Pro ~$49-69/mo · Business custom', notes: 'AI marketing platform. Brand IQ. Zero evidence layer. ~$80M ARR 2022.', evidence: true },
  { id: 'copy_ai', name: 'Copy.ai', category: 'ai_copywriting', website: 'https://copy.ai', pricing: 'Growth $1,000/mo · Expansion $2,000/mo · Scale $3,000/mo', notes: 'Pivoted to enterprise GTM automation. 17M users. No evidence features.', evidence: true },
  { id: 'writesonic', name: 'Writesonic', category: 'ai_copywriting', website: 'https://writesonic.com', pricing: 'Starter $39/mo+', notes: 'Pivoted to AI SEO/GEO platform — tracks brand in ChatGPT/Perplexity. No longer primarily writing.', evidence: true },
  { id: 'anyword', name: 'Anyword', category: 'ai_copywriting', website: 'https://anyword.com', pricing: 'Seat-based; unlimited words; API enterprise-only', notes: 'Predictive performance scores. No evidence or compliance.', evidence: true },
  { id: 'rytr', name: 'Rytr', category: 'ai_copywriting', website: 'https://rytr.me', pricing: 'Free · Unlimited $7.50/mo · Premium $24.16/mo', notes: '8M+ users. Budget AI writer. 4.9/5 G2. No evidence features.', evidence: true },
  { id: 'wordtune', name: 'Wordtune', category: 'ai_copywriting', website: 'https://wordtune.com', pricing: 'Free · Plus $13.99/mo · Unlimited $19.99/mo', notes: '"Spices" feature inserts web snippets (not peer-reviewed). No citation export.', evidence: false },
  { id: 'notion_ai', name: 'Notion AI', category: 'ai_copywriting', website: 'https://notion.so', pricing: '$10/member/mo add-on', notes: 'Workspace-integrated AI. No external evidence search.', evidence: false },
  { id: 'openai_chatgpt', name: 'ChatGPT', category: 'ai_copywriting', website: 'https://chat.openai.com', pricing: 'Free · Plus $20/mo · Team $30/mo/user', notes: 'General AI. Known hallucination risk for scientific claims. No citation management.', evidence: false },
  { id: 'grammarly', name: 'Grammarly', category: 'ai_copywriting', website: 'https://grammarly.com', pricing: 'Free · Premium $12/mo · Business $15/mo/user', notes: '30M+ daily users. Writing quality focused. Zero evidence features.', evidence: false },
  { id: 'consensus', name: 'Consensus', category: 'research_assistant', website: 'https://consensus.app', pricing: 'Free 20 searches/mo · Premium $10.99/mo · Enterprise custom', notes: '200M+ papers. GPT-4 synthesis. Consensus meters. No content output.', evidence: true },
  { id: 'elicit', name: 'Elicit', category: 'research_assistant', website: 'https://elicit.com', pricing: 'Free · Pro $49/mo · Scale $169/mo · Enterprise custom', notes: '2M+ researchers. 138M papers. Systematic review automation. No content pipeline.', evidence: true },
  { id: 'perplexity', name: 'Perplexity AI', category: 'research_assistant', website: 'https://perplexity.ai', pricing: 'Free · Pro $20/mo', notes: 'Real-time search with inline citations. Not specialized for biomedical. No compliance.', evidence: false },
  { id: 'research_rabbit', name: 'ResearchRabbit', category: 'research_assistant', website: 'https://researchrabbit.ai', pricing: 'Free', notes: '"Spotify for research papers." Citation graph. Zotero integration. No claim extraction.', evidence: false },
  { id: 'iris_ai', name: 'Iris.ai', category: 'research_assistant', website: 'https://iris.ai', pricing: 'Enterprise contract', notes: 'Enterprise R&D literature mapping. No content output. No compliance.', evidence: false },
  { id: 'scispace', name: 'SciSpace', category: 'research_assistant', website: 'https://typeset.io', pricing: 'Free · Premium ~$20/mo', notes: 'AI PDF reader. Academic reading comprehension. No output generation.', evidence: false },
  { id: 'scholarcy', name: 'Scholarcy', category: 'research_assistant', website: 'https://scholarcy.com', pricing: 'Free · Personal $8.99/mo · Team $9.99/mo/user', notes: 'Auto-summary flashcards. Reference extraction. No evidence search pipeline.', evidence: false },
  { id: 'scite', name: 'Scite', category: 'literature_tool', website: 'https://scite.ai', pricing: 'Free (limited) · Individual ~$20/mo · Institutional custom', notes: '1.5B citation statements. Smart Citations (support/contrast/mention). No content generation.', evidence: true },
  { id: 'connected_papers', name: 'Connected Papers', category: 'literature_tool', website: 'https://connectedpapers.com', pricing: 'Free 5 graphs/mo · Academic $3/mo · Pro $5/mo', notes: 'Visual paper network. Visualization only. No claim extraction.', evidence: false },
  { id: 'litmaps', name: 'Litmaps', category: 'literature_tool', website: 'https://litmaps.com', pricing: 'Free · Pro $10/mo · Institutional custom', notes: 'Dynamic literature mapping with alerts. No content generation.', evidence: false },
  { id: 'semantic_scholar', name: 'Semantic Scholar', category: 'literature_tool', website: 'https://semanticscholar.org', pricing: 'Free (API available)', notes: '200M+ papers. Allen Institute for AI. Rich public API. No content generation.', evidence: false },
  { id: 'pubmed', name: 'PubMed / NCBI', category: 'literature_tool', website: 'https://pubmed.ncbi.nlm.nih.gov', pricing: 'Free (US government)', notes: '35M+ biomedical citations. Gold-standard biomedical DB. No AI claim matching.', evidence: false },
  { id: 'zotero', name: 'Zotero', category: 'citation_manager', website: 'https://zotero.org', pricing: 'Free software · Storage $20-120/yr', notes: 'Open-source, nonprofit. No AI claim analysis. No content generation.', evidence: true },
  { id: 'mendeley', name: 'Mendeley', category: 'citation_manager', website: 'https://mendeley.com', pricing: 'Free · Plus ~$55/yr · Pro ~$165/yr', notes: 'Elsevier-owned. Strong PDF library management. Privacy concerns. No claim analysis.', evidence: false },
  { id: 'endnote', name: 'EndNote', category: 'citation_manager', website: 'https://endnote.com', pricing: 'Student $125 perpetual · Full $249 · Annual ~$165/yr', notes: 'Clarivate legacy leader. Expensive, outdated UX. Entrenched in pharma/academic.', evidence: false },
  { id: 'paperpile', name: 'Paperpile', category: 'citation_manager', website: 'https://paperpile.com', pricing: 'Regular $4.15/mo · Expert $5.75/mo · Institutional custom (HIPAA)', notes: 'Google Docs native. HIPAA institutional tier. Proxy-based off-campus PDF access.', evidence: true },
  { id: 'readcube_papers', name: 'ReadCube Papers', category: 'citation_manager', website: 'https://papersapp.com', pricing: 'Personal $55/yr · Student $36/yr · Team $90/yr/user', notes: 'Springer Nature. Strong PDF reading. Some pharma adoption. No compliance tools.', evidence: false },
  { id: 'citavi', name: 'Citavi', category: 'citation_manager', website: 'https://citavi.com', pricing: 'Free (100 titles) · Web plans ~$15/mo', notes: 'Popular in DACH region. Task planner + knowledge organization. No AI layer.', evidence: false },
  { id: 'buffer', name: 'Buffer', category: 'social_content', website: 'https://buffer.com', pricing: 'Free · Essentials $5/channel/mo · Team $10/channel/mo', notes: 'Social scheduling. Team plan has content approval workflows. No evidence features.', evidence: true },
  { id: 'hootsuite', name: 'Hootsuite', category: 'social_content', website: 'https://hootsuite.com', pricing: 'Standard/Advanced/Enterprise (dynamic)', notes: 'Enterprise: Proofpoint compliance = financial/SEC only (not MLR). OwlyGPT AI.', evidence: true },
  { id: 'sprout_social', name: 'Sprout Social', category: 'social_content', website: 'https://sproutsocial.com', pricing: 'Standard $249/mo · Professional $399/mo · Enterprise custom', notes: 'Premium social management. Strong analytics. Zero evidence/compliance features.', evidence: false },
  { id: 'lately_ai', name: 'Lately.ai', category: 'social_content', website: 'https://lately.ai', pricing: 'Solo ~$49/mo · Team ~$299/mo · Enterprise custom', notes: 'Content atomization / long-to-short repurposing. Brand voice learning. No evidence.', evidence: false },
  { id: 'taplio', name: 'Taplio', category: 'social_content', website: 'https://taplio.com', pricing: 'Starter $49/mo · Standard $65/mo · Pro $99/mo', notes: 'LinkedIn-specialized. AI post generation. No scientific content features.', evidence: false },
  { id: 'veeva_promomats', name: 'Veeva Vault PromoMats', category: 'compliance_mlr', website: 'https://veeva.com/products/veeva-promomats', pricing: 'Enterprise contract ($150k-500k+/yr)', notes: '450+ biopharmas. 47/50 top pharma. 14 months to implement. AI Agents Dec 2025. eCTD packages.', evidence: true },
  { id: 'iqvia_oce', name: 'IQVIA OCE', category: 'compliance_mlr', website: 'https://iqvia.com', pricing: 'Enterprise contract (large pharma)', notes: 'Pharma CRM + engagement. HCP interaction management. Not content evidence verification.', evidence: false },
  { id: 'zinc', name: 'Zinc (Medical Affairs)', category: 'compliance_mlr', website: 'https://zincwork.com', pricing: 'Enterprise contract', notes: 'MLR-focused Veeva alternative. Smaller but nimble. No AI content generation.', evidence: false },
  { id: 'compliant_counsel', name: 'Compliant Counsel', category: 'compliance_mlr', website: 'https://rxelite.com', pricing: 'Enterprise contract', notes: 'Niche MLR compliance SaaS. Smaller market player vs Veeva.', evidence: false },
  { id: 'kudos', name: 'Kudos', category: 'science_communication', website: 'https://growkudos.com', pricing: 'Free for authors · Institutional subscriptions', notes: 'Research impact/plain-language summaries. Social sharing. No AI claim extraction.', evidence: false },
  { id: 'altmetric', name: 'Altmetric', category: 'science_communication', website: 'https://altmetric.com', pricing: 'Explorer free · Institutional contracts', notes: 'Research attention tracking. Digital Science. Tracks mentions; does not generate content.', evidence: false },
  { id: 'the_conversation', name: 'The Conversation', category: 'science_communication', website: 'https://theconversation.com', pricing: 'Free nonprofit (member-funded)', notes: 'Expert-written articles for public. Human editorial. Not scalable for volume needs.', evidence: false },
]

export default async function CompetitorsPage() {
  // Fetch live scores from Supabase to enrich the display
  const { data: scores } = await supabase
    .from('claimcheck_scores')
    .select('competitor_id, factor_id, score')

  // Build score lookup: competitorId -> avg score
  const scoreMap: Record<string, number[]> = {}
  scores?.forEach(({ competitor_id, score }) => {
    if (!scoreMap[competitor_id]) scoreMap[competitor_id] = []
    scoreMap[competitor_id].push(score)
  })
  const avgScore = (id: string) => {
    const arr = scoreMap[id]
    if (!arr?.length) return null
    return (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)
  }

  const byCategory = ALL_COMPETITORS.reduce<Record<string, typeof ALL_COMPETITORS>>((acc, c) => {
    if (!acc[c.category]) acc[c.category] = []
    acc[c.category].push(c)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Competitors</h1>
          <p className="text-gray-400 text-sm mt-1">{ALL_COMPETITORS.length} competitors across 7 categories · Pricing verified Jan 2025</p>
        </div>
        <div className="text-xs text-gray-500 border border-gray-700 rounded-lg px-3 py-2">
          ✅ Live-fetched: {ALL_COMPETITORS.filter(c => c.evidence).length} · Estimated: {ALL_COMPETITORS.filter(c => !c.evidence).length}
        </div>
      </div>

      {Object.entries(byCategory).map(([cat, comps]) => (
        <div key={cat}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[cat] ?? 'bg-gray-800 text-gray-300 border-gray-600'}`}>
              {CATEGORY_LABELS[cat] ?? cat}
            </span>
            <span className="text-gray-600 text-xs">{comps.length} tools</span>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {comps.map((c) => {
              const avg = avgScore(c.id)
              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-gray-800 bg-gray-900 p-4 hover:border-gray-700 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-white hover:text-blue-400 transition-colors text-sm"
                    >
                      {c.name} ↗
                    </a>
                    <div className="flex items-center gap-1">
                      {avg && (
                        <span className="text-xs font-mono bg-gray-800 text-gray-300 rounded px-1.5 py-0.5">
                          avg {avg}
                        </span>
                      )}
                      {c.evidence && (
                        <span className="text-xs text-emerald-500" title="Evidence fetched">✓</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-blue-400/70 mb-2">{c.pricing}</p>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{c.notes}</p>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
