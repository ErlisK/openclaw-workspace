export default function MVPPage() {
  const stories = [
    {
      id: 'S1',
      title: 'Document Upload + Claim Extraction',
      persona: 'Science communicator',
      want: 'Upload a document (PDF, DOCX, TXT, PPTX) and get a list of extracted factual claims',
      ac: [
        'Supports PDF, DOCX, TXT, PPTX (max 50MB)',
        'Extracts ≥80% of factual claims vs. human-labeled gold set',
        'Claims shown as editable list; user can add/remove/edit',
        'Claim extraction <60s for 10,000-word document',
        'Audience selection prompt shown before proceeding',
      ],
      outOfScope: 'Real-time extraction preview; streaming; multi-document sessions',
    },
    {
      id: 'S2',
      title: 'Evidence Search + Source Retrieval',
      persona: 'Science communicator',
      want: 'Auto-search PubMed, CrossRef, Scite, and Unpaywall for peer-reviewed sources per claim',
      ac: [
        'Searches PubMed (Entrez), CrossRef, Scite, and Unpaywall per claim',
        'Returns ≥3 candidate sources per claim',
        'Each source: title, authors, year, journal, DOI, study type, abstract snippet',
        'Unpaywall OA full-text retrieved when available',
        'Source retrieval <90s/claim (async, streamed as results arrive)',
      ],
      outOfScope: 'Institutional library connectors; Elsevier ScienceDirect; on-prem connectors',
    },
    {
      id: 'S3',
      title: 'Per-Claim Confidence Scoring',
      persona: 'Science communicator',
      want: 'See a confidence score per claim to know which are well-supported vs. uncertain',
      ac: [
        'Score 0.0–1.0 per claim: source count × recency × study type hierarchy × Scite sentiment',
        '🟢 High (0.8–1.0) · 🟡 Moderate (0.5–0.79) · 🔴 Low (<0.5) · ⚫ No evidence',
        'Retraction check via Retraction Watch API; retracted sources flagged ⚠️',
        'Score explanation available on hover/expand',
      ],
      outOfScope: 'ML-based confidence model; custom weighting; real-time score updates',
    },
    {
      id: 'S4',
      title: 'Audience-Adapted Content Generation',
      persona: 'Science communicator',
      want: 'Generate channel-ready content from evidence-grounded claims for my target audience',
      ac: [
        '7 formats: Twitter/X thread, LinkedIn post, explainer blog (~500w), slide copy, patient FAQ, policy brief excerpt, press release paragraph',
        '4 audience levels: Patient (6th grade), Journalist (10th), Clinician (professional), Policymaker (exec)',
        'Each generated sentence linked to claim(s) and source(s)',
        'Low/No Evidence claims clearly marked in outputs',
        'Generation <30s/format',
      ],
      outOfScope: 'Social scheduling; brand voice training; custom templates; CMS direct push',
    },
    {
      id: 'S5',
      title: 'CiteBundle Export',
      persona: 'Science communicator / editor / compliance reviewer',
      want: 'Download a CiteBundle package to share source documentation with reviewers',
      ac: [
        'ZIP contains: citations.csv, citations.bib, citations_vancouver.docx, source_excerpts.md, confidence_report.pdf',
        'Bundle generation <60s',
        'Download available for 72 hours after session creation',
      ],
      outOfScope: 'APA/MLA/Chicago formats (Phase 2); snapshot PDFs of full papers; custom templates',
    },
    {
      id: 'S6',
      title: 'Compliance Flag Layer',
      persona: 'Medical communications professional / pharma content reviewer',
      want: 'Flag potentially non-compliant phrasing before publishing to reduce MLR review time',
      ac: [
        'Territories: FDA (US general), EMA (EU general), General health claims (EFSA/FTC)',
        'Rule packs: absolute claim detection ("cures," "eliminates"), fair balance triggers, off-label indicators, superlative flags',
        'Flags shown inline with explanation + suggested alternatives',
        'Compliance attestation report (PDF): items flagged, decisions, reviewer ID, timestamp',
        'Compliance decisions stored in DB per session (immutable)',
      ],
      outOfScope: 'FDA 21 CFR Part 11 digital signatures; custom rule pack builder; HIPAA tier',
    },
    {
      id: 'S7',
      title: 'Session Audit Trail',
      persona: 'Team lead / compliance officer / enterprise admin',
      want: 'See a complete audit trail of every claim, evidence, score, and generation decision',
      ac: [
        'Per-session: user, timestamp, document, claims, sources, scores, outputs, compliance flags/decisions, exports',
        'Viewable in-app (session history page)',
        'Exportable as PDF or JSON',
        'Immutable: entries cannot be deleted by users (admin-only purge with confirmation)',
        '12-month retention default; enterprise configurable',
      ],
      outOfScope: 'Real-time audit streaming; Splunk/SIEM integration; blockchain attestation',
    },
    {
      id: 'S8',
      title: 'Account + Team Management',
      persona: 'Team admin',
      want: 'Invite team members, assign roles, and manage org-level settings',
      ac: [
        'Auth: email + password, Google OAuth; SSO (SAML) for Enterprise only',
        'Roles: Admin (full settings), Editor (create/edit sessions), Reviewer (view + comment + compliance decisions)',
        'Org settings: compliance territory, preferred databases, study type hierarchy, brand context',
        'Usage dashboard: sessions, exports, claims processed this billing period',
        'Supabase Auth + Row-Level Security for org data isolation',
      ],
      outOfScope: 'Slack/Teams integrations; SCIM; multi-org management',
    },
  ]

  const notDoing = [
    { item: 'Social media scheduling & publishing', why: 'Scope creep; content studio ≠ social tool', when: 'Phase 3+ (API handoff only)' },
    { item: 'AI chat / open-ended prompt interface', why: 'Mismatched with compliance-grade workflow', when: 'Evaluate post-MVP' },
    { item: 'Brand voice training on custom corpus', why: 'High compute cost, low ICP priority', when: 'Phase 2' },
    { item: 'Institutional library connector (Elsevier, etc.)', why: 'Requires enterprise partnership', when: 'Enterprise tier, Phase 3' },
    { item: 'Real-time collaboration editor', why: 'Async review sufficient for MVP', when: 'Phase 2' },
    { item: 'Blockchain/NFT audit attestation', why: 'Gimmick; enterprise buyers don\'t require it', when: 'Never' },
    { item: '50+ output format templates', why: 'Breadth over depth; 7 focused formats for MVP', when: 'Selective expansion post-MVP' },
    { item: 'Video/podcast transcript claim-checking', why: 'Different input processing stack', when: 'Phase 3' },
    { item: 'Mandatory multi-step onboarding wizard', why: 'Reviewer feedback: kills time-to-value', when: 'Never; optional config only' },
    { item: 'On-prem deployment', why: 'Not relevant until enterprise tier with pharma', when: 'Phase 4 (if needed)' },
    { item: 'Mobile native app', why: 'Web-first; mobile browser sufficient', when: 'Phase 3+' },
    { item: 'LLM provider lock-in', why: 'Use router: OpenAI + Claude + Gemini fallback', when: 'Architecture decision, not feature' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">MVP Backlog</h1>
        <p className="text-gray-400 text-sm mt-1">
          8 core stories · Scope locked · Target: ≥5 paying beta customers within 6 months
        </p>
      </div>

      {/* MVP statement */}
      <div className="rounded-xl border border-cyan-700/30 bg-cyan-950/20 p-4">
        <p className="text-sm text-cyan-300 font-medium mb-1">Core MVP Workflow</p>
        <p className="text-gray-300 text-sm">
          Upload a document → Extract claims → Find peer-reviewed evidence → Generate channel-ready output with per-claim citations → Export CiteBundle
        </p>
        <p className="text-xs text-gray-500 mt-2">
          <strong className="text-white">WOW moment target:</strong> A first-time user uploads a real manuscript and says "I need this" within 10 minutes.
        </p>
      </div>

      {/* Stories */}
      <div className="space-y-4">
        {stories.map((s) => (
          <details key={s.id} className="rounded-xl border border-gray-800 bg-gray-900 group">
            <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{s.id}</span>
                <span className="font-medium text-white text-sm">{s.title}</span>
              </div>
              <span className="text-gray-600 text-xs group-open:hidden">▼ expand</span>
              <span className="text-gray-600 text-xs hidden group-open:block">▲ collapse</span>
            </summary>
            <div className="px-5 pb-5 space-y-3">
              <div className="text-xs text-gray-400">
                <strong className="text-gray-300">As a</strong> {s.persona},&nbsp;
                <strong className="text-gray-300">I want to</strong> {s.want}.
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Acceptance Criteria</div>
                <ul className="space-y-1">
                  {s.ac.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-xs text-gray-600 border-t border-gray-800 pt-3">
                <strong className="text-gray-500">Out of scope for MVP:</strong> {s.outOfScope}
              </div>
            </div>
          </details>
        ))}
      </div>

      {/* Not-doing list */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">❌ Not-Doing List</h2>
        <p className="text-gray-500 text-sm mb-4">Explicitly out of MVP scope. Must be actively rejected in design/engineering discussions.</p>
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-900 border-b border-gray-800">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Not Doing</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Why</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">When (if ever)</th>
              </tr>
            </thead>
            <tbody>
              {notDoing.map(({ item, why, when }, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900/40'}>
                  <td className="px-4 py-2.5 text-gray-300 font-medium">{item}</td>
                  <td className="px-4 py-2.5 text-gray-500">{why}</td>
                  <td className="px-4 py-2.5 text-gray-600 font-mono">{when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Definition of Done */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Definition of Done (MVP Complete When…)</h3>
        <div className="space-y-2">
          {[
            'All 8 stories pass acceptance criteria on ≥3 real user test documents',
            'Latency targets met: claim extraction <60s, evidence search <90s/claim, generation <30s/format',
            'CiteBundle export verified for correctness by a PhD-level test user',
            'Compliance flag layer verified against 10 known FDA/EMA violation phrase examples',
            'Audit trail verified as immutable (penetration test: user cannot delete entries via API)',
            '≥5 beta customers paying (Starter $29/mo or Professional $149/mo)',
            'Supabase RLS verified: org data isolation passes automated security test',
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 text-xs">
              <span className="text-gray-600 font-mono shrink-0">{i + 1}.</span>
              <span className="text-gray-400">{item}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-gray-600 border-t border-gray-800 pt-3">
          <strong className="text-gray-500">Estimated build time:</strong> 3 developers × 8 weeks = ~480 dev-hours · 
          <strong className="text-gray-500 ml-2">Critical path:</strong> Story 2 (evidence search) — deepest technical work, must start Week 1
        </div>
      </div>
    </div>
  )
}
