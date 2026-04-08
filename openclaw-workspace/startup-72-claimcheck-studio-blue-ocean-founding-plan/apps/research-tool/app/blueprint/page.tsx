import { supabase } from '@/lib/supabase'

const TABLES = [
  { name: 'sessions', desc: 'Top-level workflow unit per document upload', cols: ['id (UUID)', 'org_id', 'audience_level', 'status', 'document_path', 'claim_count', 'created_at'] },
  { name: 'claims', desc: 'Extracted factual claims from each session', cols: ['id', 'session_id', 'text', 'confidence_score (NUMERIC 0-1)', 'confidence_band (high/moderate/low/none)', 'retraction_flag', 'compliance_flags (JSONB)'] },
  { name: 'evidence_sources', desc: 'Peer-reviewed sources retrieved per claim (PubMed/CrossRef/Scite/Unpaywall)', cols: ['id', 'claim_id', 'doi', 'title', 'study_type', 'scite_supports/disputes/mentions', 'retracted', 'access_status', 'full_text_excerpt'] },
  { name: 'provenance_score_events', desc: 'Immutable log of every confidence score computation (append-only)', cols: ['id', 'claim_id', 'source_count', 'avg_recency_score', 'study_type_score', 'scite_sentiment_score', 'final_score', 'scorer_version'] },
  { name: 'generated_outputs', desc: 'LLM-generated content per format and audience level', cols: ['id', 'session_id', 'format (tweet/linkedin/blog/slide/faq/policy/press)', 'audience_level', 'content_json (JSONB)', 'compliance_checked', 'llm_model'] },
  { name: 'output_attributions', desc: 'Sentence-level claim-source links (core provenance UX)', cols: ['id', 'output_id', 'sentence_index', 'claim_id', 'source_ids (UUID[])', 'confidence_band'] },
  { name: 'audit_events', desc: 'Append-only immutable audit trail (RLS: no UPDATE/DELETE)', cols: ['id', 'org_id', 'session_id', 'claim_id', 'actor_id', 'event_type', 'event_data (JSONB)', 'ip_address', 'created_at'] },
  { name: 'compliance_rule_packs', desc: 'System and org-custom compliance rule sets (FDA/EMA/General)', cols: ['id', 'org_id (NULL=system)', 'name', 'territory (general/fda_us/ema_eu)', 'version', 'enabled'] },
  { name: 'compliance_rules', desc: 'Individual compliance rules with pattern/LLM matching', cols: ['id', 'pack_id', 'rule_code', 'category', 'severity (error/warning/info)', 'pattern_type (regex/phrase_list/llm_check)', 'pattern', 'llm_prompt', 'regulatory_ref'] },
  { name: 'compliance_checks', desc: 'Per-output compliance flag results with user decisions', cols: ['id', 'output_id', 'rule_id', 'matched_text', 'decision (accepted/overridden)', 'override_reason', 'decision_at'] },
  { name: 'reviewer_profiles', desc: 'Vetted peer reviewer marketplace participants', cols: ['id', 'credentials', 'specialties (TEXT[])', 'reputation_score', 'avg_turnaround_hours', 'stripe_account_id', 'available'] },
  { name: 'microtasks', desc: 'Paid peer review microtask assignments', cols: ['id', 'claim_id', 'task_type', 'sla_hours', 'fee_cents', 'reviewer_cut_cents (70%)', 'status (open/assigned/completed)', 'verdict', 'stripe_payment_intent_id'] },
  { name: 'citebundle_exports', desc: 'CiteBundle ZIP export tracking (DOIs + excerpts + PDFs)', cols: ['id', 'session_id', 'bundle_path', 'includes_* (booleans)', 'source_count', 'claim_count', 'expires_at (72h)', 'download_count'] },
]

const PIPELINES = [
  {
    name: 'Evidence Search Pipeline',
    color: 'border-blue-700/30 bg-blue-950/10',
    steps: [
      { step: 'User triggers evidence search', detail: 'Per session claim list' },
      { step: 'Supabase Edge Function: evidence_search_worker', detail: 'Async, parallel API calls' },
      { step: 'PubMed Entrez API', detail: 'Free, 10 req/sec with API key' },
      { step: 'CrossRef REST API', detail: 'Free, polite pool 50 req/sec' },
      { step: 'Scite API', detail: '~$0.003/claim for citation sentiment (supports/disputes/mentions)' },
      { step: 'Unpaywall API', detail: 'Free, OA full-text resolution' },
      { step: 'Retraction Watch API', detail: 'Free, retraction status check' },
      { step: 'Provenance Scorer', detail: '0.25×sources + 0.25×recency + 0.30×study_type + 0.20×scite_sentiment' },
      { step: 'Write to DB + Realtime broadcast', detail: 'evidence_sources + provenance_score_events + claims.confidence_score' },
    ],
    cost: '~$0.003/claim (dominated by Scite)',
  },
  {
    name: 'LLM Generation Pipeline',
    color: 'border-purple-700/30 bg-purple-950/10',
    steps: [
      { step: 'Claims + Evidence + Audience Level + Format', detail: 'Input to prompt builder' },
      { step: 'Prompt Builder', detail: 'System: role + output schema + compliance territory. User: evidence JSON + claims + audience instructions' },
      { step: 'LLM Router', detail: 'Primary: OpenAI GPT-4o. Fallback: Anthropic Claude 3.5 Sonnet on 429/error. Streaming: SSE to browser' },
      { step: 'Output Parser', detail: 'Extract sentence-claim attributions. Validate JSON schema.' },
      { step: 'Store generated_outputs + output_attributions', detail: 'Per format, per session' },
      { step: 'Compliance Checker trigger', detail: 'Async compliance sweep after generation' },
    ],
    cost: '~$0.35/session (7 formats × ~$0.05/format at GPT-4o rates)',
  },
  {
    name: 'Compliance Rule Engine',
    color: 'border-amber-700/30 bg-amber-950/10',
    steps: [
      { step: 'Phase 1: Pattern Sweep (<100ms)', detail: 'Regex + phrase_list rules. Fast synchronous sweep.' },
      { step: 'Phase 2: LLM Rules (batched)', detail: 'GPT-4o-mini. Batch sentences per LLM rule. Yes/no + explanation.' },
      { step: 'Phase 3: Merge + Deduplicate', detail: 'Group overlapping flags by sentence. Assign severity: error > warning > info.' },
      { step: 'Write compliance_checks rows', detail: 'One row per (output, rule) match' },
      { step: 'Compliance attestation report', detail: '@react-pdf/renderer server render. Includes: session metadata, flags, decisions, audit trail excerpt.' },
    ],
    cost: '~$0.01/output (GPT-4o-mini batch LLM rule checks)',
  },
  {
    name: 'Microtask Marketplace Flow',
    color: 'border-emerald-700/30 bg-emerald-950/10',
    steps: [
      { step: 'Requester flags claim for review', detail: 'Selects specialty required + SLA tier' },
      { step: 'System creates microtask (status=open)', detail: 'Stripe PaymentIntent created (hold funds)' },
      { step: 'Reviewer Matching', detail: 'Filter by specialty, availability, reputation. Notify top 3 reviewers.' },
      { step: 'Reviewer accepts → status=assigned', detail: 'SLA clock starts (due_at = now + sla_hours)' },
      { step: 'Reviewer submits verdict', detail: 'accepted | modified | rejected + notes + modified_claim' },
      { step: 'Stripe captures payment + Connect transfer', detail: 'Requester charged. Reviewer receives 70% via Stripe Connect.' },
      { step: 'Reputation update + audit_events INSERT', detail: 'Rolling avg reputation score. Immutable audit record.' },
    ],
    cost: 'Platform takes 30% of each microtask fee ($5-20/claim)',
  },
]

const SCORE_FORMULA = [
  { label: 'Source Count Score (25%)', formula: 'min(source_count / 5, 1.0)', note: 'Saturates at 5 sources' },
  { label: 'Recency Score (25%)', formula: 'avg(1 - (current_year - pub_year) / 20)', note: 'Decays over 20 years' },
  { label: 'Study Type Score (30%)', formula: 'avg(weight[study_type])', note: 'Meta-analysis=1.0, RCT=0.8, Cohort=0.6, Case study=0.4, Review=0.7' },
  { label: 'Scite Sentiment Score (20%)', formula: 'supports / (supports + disputes + 1)', note: '+1 avoids division by zero' },
  { label: 'Retraction Penalty', formula: '-0.3 per retracted source (cap 0.6)', note: 'Applied to final score' },
]

export default async function BlueprintPage() {
  const { data: rulesData } = await supabase
    .from('compliance_rules')
    .select('rule_code, category, severity, description, regulatory_ref')
    .order('rule_code')

  const { data: packsData } = await supabase
    .from('compliance_rule_packs')
    .select('name, territory, version')
    .order('territory')

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Technical Blueprint</h1>
        <p className="text-gray-400 text-sm mt-1">
          High-level data model and service architecture for provenance scoring, audit trail, microtasks, and compliance
        </p>
      </div>

      {/* Architecture overview */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">System Architecture</h2>
        <div className="grid grid-cols-4 gap-3 text-xs">
          {[
            { layer: 'Browser', desc: 'Next.js App Router', items: ['Upload flow', 'Claim review UI', 'Evidence cards', 'Compliance flags', 'CiteBundle export'] },
            { layer: 'API Layer', desc: 'Next.js + Vercel Edge', items: ['/api/sessions', '/api/claims', '/api/evidence', '/api/generate', '/api/compliance', '/api/microtasks', '/api/audit'] },
            { layer: 'Data Layer', desc: 'Supabase (Postgres + Auth + Storage + Realtime)', items: ['13 core tables', 'RLS per org', 'Append-only audit', 'Realtime evidence updates', 'Supabase Storage (docs + ZIPs)'] },
            { layer: 'External APIs', desc: 'Evidence + LLM + Payments', items: ['PubMed Entrez (free)', 'CrossRef REST (free)', 'Scite API (~$500/mo)', 'Unpaywall (free)', 'OpenAI GPT-4o', 'Claude 3.5 (fallback)', 'Stripe Payments + Connect'] },
          ].map(({ layer, desc, items }) => (
            <div key={layer} className="border border-gray-700 rounded-lg p-3">
              <div className="font-semibold text-white mb-0.5">{layer}</div>
              <div className="text-gray-600 mb-2">{desc}</div>
              <ul className="space-y-0.5">
                {items.map((item, i) => (
                  <li key={i} className="text-gray-500 flex items-start gap-1">
                    <span className="text-gray-700 shrink-0">·</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Provenance score formula */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Provenance Confidence Score Formula (v1)</h2>
        <div className="space-y-2 mb-4">
          {SCORE_FORMULA.map(({ label, formula, note }) => (
            <div key={label} className="grid grid-cols-12 gap-3 text-xs items-start">
              <div className="col-span-3 text-gray-400 font-medium">{label}</div>
              <div className="col-span-5 font-mono bg-gray-800 rounded px-2 py-1 text-emerald-300">{formula}</div>
              <div className="col-span-4 text-gray-600">{note}</div>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-800 pt-3 text-xs grid grid-cols-4 gap-3">
          {[
            { band: '🟢 High', range: 'score >= 0.80' },
            { band: '🟡 Moderate', range: 'score >= 0.50' },
            { band: '🔴 Low', range: 'score >= 0.01' },
            { band: '⚫ No Evidence', range: 'score == 0' },
          ].map(({ band, range }) => (
            <div key={band} className="flex items-center gap-2">
              <span className="text-gray-300">{band}</span>
              <code className="text-gray-600 font-mono">{range}</code>
            </div>
          ))}
        </div>
      </div>

      {/* Pipelines */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-4">Service Pipelines</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {PIPELINES.map((p) => (
            <div key={p.name} className={`rounded-xl border p-4 ${p.color}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                <span className="text-xs text-gray-500">{p.cost}</span>
              </div>
              <div className="space-y-1.5">
                {p.steps.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-gray-700 font-mono shrink-0 mt-0.5">{i + 1}.</span>
                    <div>
                      <span className="text-gray-300">{s.step}</span>
                      <span className="text-gray-600 ml-1">— {s.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data model tables */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-4">Data Model — {TABLES.length} Core Tables</h2>
        <div className="space-y-3">
          {TABLES.map((t) => (
            <details key={t.name} className="rounded-xl border border-gray-800 bg-gray-900 group">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none">
                <div className="flex items-center gap-3">
                  <code className="text-xs font-mono bg-gray-800 text-emerald-300 px-2 py-0.5 rounded">{t.name}</code>
                  <span className="text-xs text-gray-500">{t.desc}</span>
                </div>
                <span className="text-gray-600 text-xs group-open:hidden">▼</span>
                <span className="text-gray-600 text-xs hidden group-open:block">▲</span>
              </summary>
              <div className="px-4 pb-4">
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {t.cols.map((c) => (
                    <code key={c} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{c}</code>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Compliance rules from DB */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-2">Seeded Compliance Rules</h2>
        <p className="text-xs text-gray-500 mb-4">
          {rulesData?.length ?? 0} rules across {packsData?.length ?? 0} packs — live from Supabase
        </p>
        {packsData && packsData.length > 0 && (
          <div className="space-y-4">
            {packsData.map((pack) => (
              <div key={pack.territory} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-semibold text-white">{pack.name}</span>
                  <span className="text-xs text-gray-600 font-mono">{pack.territory} v{pack.version}</span>
                </div>
                <div className="space-y-2">
                  {rulesData?.filter(() => true).map((r) => (
                    r.rule_code.startsWith(
                      pack.territory === 'general' ? 'GEN' :
                      pack.territory === 'fda_us' ? 'FDA' : 'EMA'
                    ) && (
                      <div key={r.rule_code} className="flex items-start gap-3 text-xs">
                        <code className="bg-gray-800 text-amber-300 px-1.5 py-0.5 rounded shrink-0">{r.rule_code}</code>
                        <span className={`shrink-0 px-1.5 py-0.5 rounded ${r.severity === 'error' ? 'bg-red-900/40 text-red-300' : 'bg-amber-900/40 text-amber-300'}`}>{r.severity}</span>
                        <span className="text-gray-400">{r.description}</span>
                        <span className="text-gray-600 shrink-0">{r.regulatory_ref}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Phase 3 implementation sequence */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Phase 3 Implementation Sequence (16 weeks)</h3>
        <div className="grid md:grid-cols-4 gap-3 text-xs">
          {[
            { wks: 'Wk 1-2', task: 'Core schema migration + RLS policies + Auth setup' },
            { wks: 'Wk 3-4', task: 'Evidence search pipeline (PubMed + CrossRef + Unpaywall)' },
            { wks: 'Wk 5-6', task: 'Provenance scoring engine + claim extraction LLM' },
            { wks: 'Wk 7-8', task: 'Content generation pipeline + output attribution' },
            { wks: 'Wk 9-10', task: 'Compliance rule engine (pattern phase + FDA/EMA rule packs)' },
            { wks: 'Wk 11-12', task: 'Audit trail enforcement + CiteBundle export' },
            { wks: 'Wk 13-14', task: 'Microtask marketplace MVP (basic flow + Stripe Connect)' },
            { wks: 'Wk 15-16', task: 'Beta hardening + performance + RLS audit + latency targets' },
          ].map(({ wks, task }, i) => (
            <div key={i} className="border border-gray-700 rounded-lg p-3">
              <div className="text-gray-500 font-mono mb-1">{wks}</div>
              <p className="text-gray-400 leading-relaxed">{task}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
