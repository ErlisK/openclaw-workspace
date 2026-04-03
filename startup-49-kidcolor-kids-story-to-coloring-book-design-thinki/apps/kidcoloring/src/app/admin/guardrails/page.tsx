export const revalidate = 86400

interface RlsPolicy {
  tablename: string
  policyname: string
  cmd: string
}

interface SchemaVersion {
  version: string
  description: string
  applied_at: string
}

interface DbFunction {
  proname: string
}

async function fetchSql<T>(query: string): Promise<T[]> {
  const res = await fetch(
    'https://api.supabase.com/v1/projects/lpxhxmpzqjygsaawkrva/database/query',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      cache: 'no-store',
    }
  )
  if (!res.ok) return []
  return res.json() as Promise<T[]>
}

const GUARDRAILS = [
  {
    id: 'G-01',
    tier: 1,
    title: 'Parent-Owned Accounts Only',
    emoji: '👨‍👧',
    color: 'red',
    rule: 'Children never create accounts. Children never authenticate. Children never provide any personal information directly to the system.',
    enforcement: [
      'profiles.role CHECK constraint: only parent | teacher | admin',
      'No child auth route exists in the application',
      'Kid-facing UI runs under parent anonymous session',
      'children table uses parent_id FK — created by parent only',
    ],
    evidence: '62 safety snippets + COPPA 16 CFR Part 312',
    event: 'coppa_gate_shown',
    test: 'Red-team: attempt child account creation via any UI path, API, or direct Supabase call',
  },
  {
    id: 'G-02',
    tier: 1,
    title: 'Strict Data Minimization',
    emoji: '🔒',
    color: 'red',
    rule: 'Collect only the minimum data necessary. No date of birth. No real name. No child IP address. Story text deleted after 90 days.',
    enforcement: [
      'children.age_years (integer, not DOB)',
      'children.nickname (not real name)',
      'stories.raw_text purged via purge_expired_story_text() after 90 days',
      'events.properties validated — no child PII allowed',
    ],
    evidence: 'Phase 1 research: 507 snippets; COPPA data minimization principle',
    event: 'story_text_purged',
    test: 'Verify no DOB column in children table; verify raw_text cron runs and clears text at 90d',
  },
  {
    id: 'G-03',
    tier: 1,
    title: 'Kid-Facing UI Requires Zero Reading',
    emoji: '🎨',
    color: 'orange',
    rule: 'The story input screen and preview must be fully usable by a child who cannot read. Icon-only selection. Voice input option. Audio labels on every element.',
    enforcement: [
      '4-step wizard uses illustrated icon cards, not text fields',
      'Voice input transcribes child speech — no keyboard required',
      'Touch targets ≥ 48×48px',
      'Font size ≥ 24px for any text that appears',
      'Audio plays on every card tap',
    ],
    evidence: 'age_fit theme (86 snippets); Emma persona storyboard; design-principles.md DP-03',
    event: 'story_wizard_started',
    test: 'Usability test: 5 children aged 4–7 complete wizard without verbal prompts',
  },
  {
    id: 'G-04',
    tier: 1,
    title: 'Explicit Deletion Flows',
    emoji: '🗑️',
    color: 'red',
    rule: 'Parent can permanently delete their account and all associated data in ≤3 taps, at any time, from within the app.',
    enforcement: [
      'deleted_at column on profiles, children, books',
      'soft_delete_account() — marks all rows, 30-day grace',
      'hard_delete_expired_accounts() — nightly cron, cascades all data',
      'purge_expired_story_text() — clears raw_text at 90 days',
      'Deletion audit events written to events table before cascade',
    ],
    evidence: 'COPPA right to deletion; GDPR right to erasure; CCPA Cal. Civ. Code §1798',
    event: 'account_deletion_requested → account_deleted_hard',
    test: 'Walk all 4 deletion flows; verify cascade with row counts',
  },
  {
    id: 'G-05',
    tier: 2,
    title: 'No Behavioral Advertising or Data Selling',
    emoji: '🚫',
    color: 'yellow',
    rule: 'User data is never sold, licensed, or used for behavioral ad targeting. First-party analytics only.',
    enforcement: [
      'No third-party analytics pixels on any page',
      'No Facebook/Meta pixel on child content screens',
      'events table data: internal analytics only',
    ],
    evidence: "Brand trust; 62 safety snippets — parents cite 'data sharing' as a top concern",
    event: '(negative: no ad_pixel_fired event should ever appear)',
    test: 'Network tab audit: verify no third-party tracking requests on kid-facing pages',
  },
  {
    id: 'G-06',
    tier: 2,
    title: 'No Dark Patterns in Subscription',
    emoji: '⚖️',
    color: 'yellow',
    rule: 'Cancellation = same steps as sign-up. One "are you sure?" max. No pre-checked renewal boxes. Free tier grace period on cancellation.',
    enforcement: [
      'Cancel flow: same 3 taps as subscribe flow',
      'Single confirmation modal with clear language',
      'subscription_ends_at maintained for grace period',
    ],
    evidence: 'Phase 1 research: 44 "cost too high" snippets; trust = conversion',
    event: 'subscription_cancelled',
    test: 'UX walk-through: cancellation ≤3 taps from settings page',
  },
  {
    id: 'G-07',
    tier: 1,
    title: 'AI Output Safety — Three Layers',
    emoji: '🛡️',
    color: 'red',
    rule: 'Three independent safety checks before any image reaches a child: input text filter, prompt sanitization, output image classifier.',
    enforcement: [
      'Layer 1: OpenAI Moderation on stories.raw_text → safety_passed boolean',
      'Layer 2: System prompt wraps user story in strict coloring-book context',
      'Layer 3: Google Vision SafeSearch on every generated page image',
      'books.status = failed if any layer fails; auto-refund triggered',
    ],
    evidence: 'C2 assumption (Assumption Criticality #7); 62 safety snippets',
    event: 'safety_input_blocked | safety_output_flagged | safety_output_approved',
    test: 'Red-team 200 adversarial prompts; verify safety_output_approved rate ≥ 99.5%',
  },
  {
    id: 'G-08',
    tier: 2,
    title: 'Transparent AI Disclosure',
    emoji: '🤖',
    color: 'yellow',
    rule: "Parents are told at sign-up and at each book creation that content is AI-generated.",
    enforcement: [
      'COPPA consent modal includes AI disclosure',
      'Preview footer: "AI-generated · Reviewed for age-appropriateness"',
      'Privacy policy has required "How we use AI" section',
    ],
    evidence: 'FTC AI disclosure guidelines; parent trust research snippets',
    event: 'coppa_consent_shown',
    test: 'UI audit: AI disclosure visible at sign-up, on preview, in privacy policy',
  },
  {
    id: 'G-09',
    tier: 1,
    title: 'Story Text Deleted After 90 Days',
    emoji: '⏳',
    color: 'red',
    rule: 'stories.raw_text cleared 90 days after books.delivered_at. Reduces PII retention risk.',
    enforcement: [
      'purge_expired_story_text() function in Supabase',
      'Vercel cron route /api/cron/story-cleanup (nightly)',
      'raw_text set to "[deleted]" sentinel (row retained for analytics)',
    ],
    evidence: 'COPPA data retention minimization; family details shared casually in story prompts',
    event: 'story_text_purged',
    test: 'Insert test story with delivered_at = 91 days ago; run cron; verify raw_text = "[deleted]"',
  },
  {
    id: 'G-10',
    tier: 2,
    title: 'Print-Only Delivery by Default',
    emoji: '🖨️',
    color: 'yellow',
    rule: 'Default: PDF to parent for home printing. No persistent child-accessible cloud storage.',
    enforcement: [
      'Checkout default: "Download PDF" (not "Save to cloud")',
      '"Save to My Books" requires explicit opt-in',
      'PDF URL expires after 24 hours (signed URL)',
    ],
    evidence: 'Physical print preference: 38 "physical book" snippets; instant delivery demand',
    event: 'pdf_downloaded',
    test: 'Verify PDF URL expires; verify no persistent child-accessible URL is created by default',
  },
]

const TIER_COLORS: Record<number, string> = {
  1: 'bg-red-100 text-red-800 border-red-200',
  2: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  3: 'bg-gray-100 text-gray-600 border-gray-200',
}

const CARD_COLORS: Record<string, string> = {
  red: 'border-red-200 bg-red-50',
  orange: 'border-orange-200 bg-orange-50',
  yellow: 'border-yellow-200 bg-yellow-50',
  green: 'border-green-200 bg-green-50',
}

const BADGE_COLORS: Record<string, string> = {
  red: 'bg-red-100 text-red-700',
  orange: 'bg-orange-100 text-orange-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  green: 'bg-green-100 text-green-700',
}

export default async function GuardrailsPage() {
  const [rlsPolicies, migrations, functions] = await Promise.all([
    fetchSql<RlsPolicy>(
      "SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname"
    ),
    fetchSql<SchemaVersion>(
      "SELECT version, description, applied_at FROM schema_migrations ORDER BY applied_at"
    ),
    fetchSql<DbFunction>(
      "SELECT proname FROM pg_proc WHERE proname IN ('soft_delete_account','hard_delete_expired_accounts','purge_expired_story_text') ORDER BY proname"
    ),
  ])

  const tier1 = GUARDRAILS.filter(g => g.tier === 1)
  const tier2 = GUARDRAILS.filter(g => g.tier === 2)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-red-700 text-white px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-1 text-sm">
            <a href="/admin" className="text-red-300 hover:text-white">← Admin</a>
            <span className="text-red-400">/</span>
            <span className="text-red-200">Guardrails</span>
          </div>
          <h1 className="text-2xl font-bold">🛡️ Product Guardrails</h1>
          <p className="text-red-200 text-sm mt-1">
            Non-negotiable constraints · {tier1.length} Tier 1 (blockers) · {tier2.length} Tier 2 (strong preferences) ·{' '}
            {rlsPolicies.length} RLS policies live · {functions.length}/3 deletion functions deployed
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* ── Schema Status ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">RLS Policies Live</p>
            <p className="text-3xl font-bold text-green-600">{rlsPolicies.length}</p>
            <p className="text-xs text-gray-500 mt-1">across {new Set(rlsPolicies.map(p => p.tablename)).size} tables</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">Schema Migrations</p>
            <p className="text-3xl font-bold text-blue-600">{migrations.length}</p>
            <div className="text-xs text-gray-500 mt-1">
              {migrations.map(m => <div key={m.version}>{m.version}</div>)}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">Deletion Functions</p>
            <p className="text-3xl font-bold text-purple-600">{functions.length}/3</p>
            <div className="text-xs text-gray-500 mt-1">
              {functions.map(f => <div key={f.proname} className="font-mono">{f.proname}()</div>)}
            </div>
          </div>
        </div>

        {/* ── Tier 1 Guardrails ── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-gray-900">Tier 1 — Absolute Constraints</h2>
            <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-bold">BLOCKERS</span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Violation of any Tier 1 guardrail is a shipping blocker. Do not merge. Do not launch.
          </p>
          <div className="space-y-4">
            {tier1.map(g => (
              <div key={g.id} className={`rounded-2xl border-2 p-5 ${CARD_COLORS[g.color] || 'border-gray-200 bg-white'}`}>
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{g.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TIER_COLORS[g.tier]}`}>
                        {g.id} · Tier {g.tier}
                      </span>
                      <h3 className="font-bold text-gray-900">{g.title}</h3>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-800 mb-3 font-medium italic">&ldquo;{g.rule}&rdquo;</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1.5">⚙️ Enforcement</p>
                    <ul className="space-y-1">
                      {g.enforcement.map((e, i) => (
                        <li key={i} className="text-xs text-gray-700 flex gap-1.5">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span className="font-mono">{e}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">📊 Measurable Event</p>
                      <code className={`text-xs px-2 py-1 rounded ${BADGE_COLORS[g.color] || 'bg-gray-100 text-gray-600'}`}>
                        {g.event}
                      </code>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">🧪 Test</p>
                      <p className="text-xs text-gray-700">{g.test}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">📚 Evidence</p>
                      <p className="text-xs text-gray-500">{g.evidence}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tier 2 Guardrails ── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-gray-900">Tier 2 — Strong Preferences</h2>
            <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-bold">REQUIRE SIGN-OFF TO OVERRIDE</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tier2.map(g => (
              <div key={g.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{g.emoji}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TIER_COLORS[g.tier]}`}>
                    {g.id}
                  </span>
                  <h3 className="font-semibold text-gray-900 text-sm">{g.title}</h3>
                </div>
                <p className="text-xs text-gray-600 mb-2">{g.rule}</p>
                <div className="space-y-1">
                  {g.enforcement.map((e, i) => (
                    <div key={i} className="text-xs text-gray-500 flex gap-1.5">
                      <span className="text-yellow-500">•</span>
                      <span>{e}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── RLS Policies Table ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Live RLS Policies</h2>
          <p className="text-sm text-gray-500 mb-4">
            Row-level security ensures parents can only read/write their own data. Service role bypasses for analytics.
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Table</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Policy</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Command</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rlsPolicies.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-violet-700">{p.tablename}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-700">{p.policyname}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.cmd === 'ALL' ? 'bg-blue-100 text-blue-700' :
                        p.cmd === 'SELECT' ? 'bg-green-100 text-green-700' :
                        p.cmd === 'INSERT' ? 'bg-yellow-100 text-yellow-700' :
                        p.cmd === 'UPDATE' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{p.cmd}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Pre-Launch Compliance Checklist ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Pre-Launch Compliance Checklist</h2>
          <p className="text-sm text-gray-500 mb-4">
            All boxes must be checked before public beta launch. Documented in <code className="text-xs">guardrails.md</code>.
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                ['⬜', 'COPPA consent modal reviewed by legal counsel'],
                ['⬜', 'No child account creation path in any UI state'],
                ['✅', "children table has NO date-of-birth column (uses age_years int)"],
                ['✅', 'Story raw text deletion function deployed (purge_expired_story_text)'],
                ['✅', 'Account + child deletion cascade functions deployed'],
                ['⬜', 'Deletion flows tested end-to-end against production schema'],
                ['⬜', 'Safety filter red-teamed with 200 adversarial prompts'],
                ['⬜', 'AI disclosure copy approved and visible on every preview page'],
                ['⬜', 'Privacy policy published at /privacy and linked from sign-up'],
                ['⬜', 'CCPA "Do Not Sell" link visible in footer'],
                ['⬜', 'Deletion confirmation email tested (< 60 seconds)'],
                ['✅', 'RLS policies active on all 8 user-facing tables'],
              ].map(([status, item], i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className={status === '✅' ? 'text-green-500' : 'text-gray-300'}>{status}</span>
                  <span className={status === '✅' ? 'text-gray-700' : 'text-gray-500'}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
