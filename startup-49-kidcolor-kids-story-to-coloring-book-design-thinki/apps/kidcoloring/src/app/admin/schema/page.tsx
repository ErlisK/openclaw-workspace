export const revalidate = 3600

interface TableRow {
  table_name: string
  table_type: string
}

interface ColRow {
  table_name: string
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
}

interface PolicyRow {
  tablename: string
  policyname: string
  cmd: string
}

interface MigrationRow {
  version: string
  description: string
  applied_at: string
}

interface FnRow {
  proname: string
}

interface IndexRow {
  tablename: string
  indexname: string
}

async function mgmtQuery<T>(sql: string): Promise<T[]> {
  const res = await fetch(
    'https://api.supabase.com/v1/projects/lpxhxmpzqjygsaawkrva/database/query',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
      cache: 'no-store',
    }
  )
  if (!res.ok) return []
  return res.json() as Promise<T[]>
}

// Domain model entities with their canonical names and docs
const ENTITIES = [
  {
    canonical: 'parents',
    table: 'profiles',
    view: 'parents',
    emoji: '👨‍👧',
    color: 'blue',
    role: 'Root of all ownership. Authenticated adult accounts (parent or teacher). Children never have accounts.',
    keyInvariants: [
      'coppa_agreed must be true before any prompt can be created',
      'role ∈ {parent, teacher, admin} — no child role',
      'deleted_at → 30-day grace → hard delete cascade',
      'referral_code auto-generated on INSERT',
    ],
    retention: 'Until deletion + 30d grace',
    isNew: false,
  },
  {
    canonical: 'child_profiles',
    table: 'children',
    view: 'child_profiles',
    emoji: '🧒',
    color: 'purple',
    role: 'COPPA-compliant child records. Nickname + integer age only — no DOB, no real name, no child auth.',
    keyInvariants: [
      'age_years drives line weight: 2-4yo→5pt, 5-7yo→3pt, 8-11yo→1.5pt',
      'Maximum 5 child profiles per parent (application layer)',
      'parent_id always references an adult profile',
      'deleted_at → 30-day grace with parent cascade',
    ],
    retention: 'Until parent deletes + 30d grace',
    isNew: false,
  },
  {
    canonical: 'prompts',
    table: 'stories',
    view: 'prompts',
    emoji: '✍️',
    color: 'yellow',
    role: 'Raw creative input: wizard-assembled, typed, or voice-transcribed. Pre-generation safety classification stored here.',
    keyInvariants: [
      'safety_passed = false → no generation_job created',
      'raw_text purged to [deleted] 90 days after book delivery',
      'One prompt → exactly one generation_job (UNIQUE FK)',
      'wizard_steps JSONB: {characters, setting, action, hero_name}',
    ],
    retention: 'raw_text purged at 90d; row retained for analytics',
    isNew: false,
  },
  {
    canonical: 'generation_jobs',
    table: 'generation_jobs',
    view: null,
    emoji: '⚙️',
    color: 'orange',
    role: 'State machine for the AI pipeline. Decouples prompt from generation. Tracks cost, timing, errors, retries.',
    keyInvariants: [
      'UNIQUE(story_id) — exactly one job per prompt',
      'Status: queued→dispatched→generating→partial→complete|failed|cancelled',
      'cost_usd written on completion (unit economics tracking)',
      'complete_generation_job() and fail_generation_job() are the only write paths',
    ],
    retention: 'input_prompt purged at 90d; row retained permanently for cost analytics',
    isNew: true,
  },
  {
    canonical: 'books',
    table: 'books',
    view: null,
    emoji: '📚',
    color: 'green',
    role: 'The purchasable artifact. Owns payment state, PDF delivery, and the product type (single/party_pack/subscription_book).',
    keyInvariants: [
      'Status: queued→generating→preview_ready→failed→purchased→delivered',
      'price_variant links to pricing A/B experiment',
      'pdf_url is a signed URL (24h expiry by default)',
      '7-year financial record retention (soft-delete suppressed)',
    ],
    retention: '7 years (financial record)',
    isNew: false,
  },
  {
    canonical: 'coloring_pages',
    table: 'pages',
    view: 'coloring_pages',
    emoji: '🎨',
    color: 'pink',
    role: 'Individual generated pages. UNIQUE(book_id, page_index). Pages 0–1 are preview (watermarked). Page 0 is the cover.',
    keyInvariants: [
      'generation_job_id links each page to its job for cost attribution',
      'UNIQUE(book_id, page_index) — no duplicate positions',
      'is_preview = true for page_index ∈ {0, 1}',
      'is_cover = true for page_index = 0 only',
    ],
    retention: 'Follows book retention',
    isNew: false,
  },
  {
    canonical: 'moderation_events',
    table: 'moderation_events',
    view: null,
    emoji: '🛡️',
    color: 'red',
    role: 'Append-only safety audit log. Three-layer coverage: input_text (Layer 1), output_image (Layer 3), manual_review.',
    keyInvariants: [
      'Append-only: no UPDATE or DELETE ever',
      'Service_role only — no client RLS write access',
      'result=blocked on input_text → stories.safety_passed=false',
      'result=flagged on output_image → books.status=failed + refund',
    ],
    retention: 'input_text_snippet purged at 90d; row retained 7 years (compliance)',
    isNew: true,
  },
]

const COLOR_STYLES: Record<string, { card: string; badge: string; dot: string }> = {
  blue:   { card: 'border-blue-200 bg-blue-50',   badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-400' },
  purple: { card: 'border-purple-200 bg-purple-50', badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400' },
  yellow: { card: 'border-yellow-200 bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  orange: { card: 'border-orange-200 bg-orange-50', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  green:  { card: 'border-green-200 bg-green-50',  badge: 'bg-green-100 text-green-700',  dot: 'bg-green-400' },
  pink:   { card: 'border-pink-200 bg-pink-50',    badge: 'bg-pink-100 text-pink-700',    dot: 'bg-pink-400' },
  red:    { card: 'border-red-200 bg-red-50',      badge: 'bg-red-100 text-red-700',      dot: 'bg-red-400' },
}

export default async function SchemaPage() {
  const [tables, columns, policies, migrations, functions, indexes] = await Promise.all([
    mgmtQuery<TableRow>(
      "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema='public' ORDER BY table_type, table_name"
    ),
    mgmtQuery<ColRow>(
      "SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('generation_jobs','moderation_events','profiles','children','stories','books','pages') ORDER BY table_name, ordinal_position"
    ),
    mgmtQuery<PolicyRow>(
      "SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname"
    ),
    mgmtQuery<MigrationRow>(
      "SELECT version, description, applied_at FROM schema_migrations ORDER BY applied_at"
    ),
    mgmtQuery<FnRow>(
      "SELECT proname FROM pg_proc WHERE pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='public') AND proname NOT LIKE '%trgm%' AND proname NOT LIKE 'gtrgm%' AND proname NOT LIKE 'gin_%' AND proname NOT IN ('set_limit','show_limit','show_trgm','similarity','similarity_op','similarity_dist','word_similarity','word_similarity_op','word_similarity_dist_op','word_similarity_commutator_op','word_similarity_dist_commutator_op','strict_word_similarity','strict_word_similarity_op','strict_word_similarity_dist_op','strict_word_similarity_commutator_op','strict_word_similarity_dist_commutator_op') ORDER BY proname"
    ),
    mgmtQuery<IndexRow>(
      "SELECT tablename, indexname FROM pg_indexes WHERE schemaname='public' AND tablename IN ('generation_jobs','moderation_events') ORDER BY tablename, indexname"
    ),
  ])

  const baseTableCount = tables.filter(t => t.table_type === 'BASE TABLE').length
  const viewCount = tables.filter(t => t.table_type === 'VIEW').length
  const colsByTable: Record<string, ColRow[]> = {}
  columns.forEach(c => {
    if (!colsByTable[c.table_name]) colsByTable[c.table_name] = []
    colsByTable[c.table_name].push(c)
  })

  const DATA_TYPE_SHORT: Record<string, string> = {
    'uuid': 'uuid',
    'text': 'text',
    'boolean': 'bool',
    'integer': 'int',
    'smallint': 'int2',
    'bigint': 'int8',
    'numeric': 'numeric',
    'jsonb': 'jsonb',
    'ARRAY': 'text[]',
    'timestamp with time zone': 'timestamptz',
    'bigserial': 'bigserial',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-slate-800 text-white px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-1 text-sm">
            <a href="/admin" className="text-slate-400 hover:text-white">← Admin</a>
            <span className="text-slate-500">/</span>
            <span className="text-slate-300">Domain Model & Schema</span>
          </div>
          <h1 className="text-2xl font-bold">🗄️ Domain Model &amp; Schema</h1>
          <p className="text-slate-300 text-sm mt-1">
            {baseTableCount} tables · {viewCount} view aliases · {policies.length} RLS policies ·{' '}
            {functions.length} functions · {migrations.length} migrations applied
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* ── Migration Status ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Schema Migration History</h2>
          <div className="space-y-2">
            {migrations.map(m => (
              <div key={m.version} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
                <span className="text-green-500 mt-0.5 text-lg">✅</span>
                <div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-bold text-violet-700">{m.version}</code>
                    <span className="text-xs text-gray-400">{new Date(m.applied_at).toISOString().slice(0, 10)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{m.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── ER Summary ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ownership Chain</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 flex-wrap text-sm font-mono">
              {[
                { label: 'auth.users', color: 'bg-gray-100 text-gray-600' },
                { label: '→', plain: true },
                { label: 'parents (profiles)', color: 'bg-blue-100 text-blue-700' },
                { label: '→', plain: true },
                { label: 'child_profiles (children)', color: 'bg-purple-100 text-purple-700' },
              ].map((item, i) => (
                item.plain
                  ? <span key={i} className="text-gray-400 text-lg">{item.label}</span>
                  : <span key={i} className={`px-2 py-1 rounded-lg text-xs font-bold ${item.color}`}>{item.label}</span>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap text-sm font-mono">
              {[
                { label: 'prompts (stories)', color: 'bg-yellow-100 text-yellow-700' },
                { label: '→ 1:1 →', plain: true },
                { label: 'generation_jobs', color: 'bg-orange-100 text-orange-700', isNew: true },
                { label: '→ 1:1 →', plain: true },
                { label: 'books', color: 'bg-green-100 text-green-700' },
                { label: '→ 1:N →', plain: true },
                { label: 'coloring_pages (pages)', color: 'bg-pink-100 text-pink-700' },
              ].map((item, i) => (
                item.plain
                  ? <span key={i} className="text-gray-400">{item.label}</span>
                  : <span key={i} className={`px-2 py-1 rounded-lg text-xs font-bold ${item.color}`}>
                      {item.label}
                      {'isNew' in item && item.isNew && <span className="ml-1 text-orange-600">★</span>}
                    </span>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap text-sm font-mono">
              {[
                { label: 'prompts + generation_jobs + coloring_pages', color: 'bg-red-100 text-red-700' },
                { label: '→ N →', plain: true },
                { label: 'moderation_events', color: 'bg-red-100 text-red-700', isNew: true },
              ].map((item, i) => (
                item.plain
                  ? <span key={i} className="text-gray-400">{item.label}</span>
                  : <span key={i} className={`px-2 py-1 rounded-lg text-xs font-bold ${item.color}`}>
                      {item.label}
                      {'isNew' in item && item.isNew && <span className="ml-1 text-orange-600">★</span>}
                    </span>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">★ = new in v1.0.0 · all entities feed into <code>events</code> (analytics stream)</p>
          </div>
        </section>

        {/* ── Entity Cards ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Entities</h2>
          <div className="grid grid-cols-1 gap-5">
            {ENTITIES.map(entity => {
              const style = COLOR_STYLES[entity.color] || COLOR_STYLES.blue
              const cols = colsByTable[entity.table] || []
              return (
                <div key={entity.canonical}
                  className={`rounded-2xl border-2 p-5 ${style.card}`}>
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-2xl">{entity.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-lg">
                          <code>{entity.canonical}</code>
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                          table: {entity.table}
                        </span>
                        {entity.view && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            view alias: {entity.view}
                          </span>
                        )}
                        {entity.isNew && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold">
                            ★ NEW v1.0
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{entity.role}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Columns */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Columns</p>
                      <div className="space-y-0.5">
                        {cols.map(col => (
                          <div key={col.column_name}
                            className="flex items-center gap-2 text-xs py-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
                            <code className="font-mono text-gray-800 font-medium w-36 flex-shrink-0">
                              {col.column_name}
                            </code>
                            <span className="text-gray-400">
                              {DATA_TYPE_SHORT[col.data_type] || col.data_type}
                              {col.is_nullable === 'NO' ? ' !' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Invariants + retention */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Key Invariants</p>
                      <ul className="space-y-1">
                        {entity.keyInvariants.map((inv, i) => (
                          <li key={i} className="text-xs text-gray-700 flex gap-1.5">
                            <span className="text-gray-400 mt-0.5">›</span>
                            <span>{inv}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Retention</p>
                        <p className="text-xs text-gray-600">{entity.retention}</p>
                      </div>
                    </div>
                  </div>

                  {/* Indexes for new tables */}
                  {entity.isNew && indexes.filter(ix => ix.tablename === entity.table).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Indexes</p>
                      <div className="flex flex-wrap gap-1.5">
                        {indexes
                          .filter(ix => ix.tablename === entity.table)
                          .map(ix => (
                            <code key={ix.indexname}
                              className="text-xs bg-white bg-opacity-70 px-2 py-0.5 rounded text-gray-600">
                              {ix.indexname}
                            </code>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ── State Machine ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Generation Job State Machine</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { status: 'queued', desc: 'Created, awaiting worker', color: 'bg-gray-100 text-gray-700' },
                { status: 'dispatched', desc: 'Sent to AI provider', color: 'bg-blue-100 text-blue-700' },
                { status: 'generating', desc: 'First page received', color: 'bg-yellow-100 text-yellow-700' },
                { status: 'partial', desc: 'Interrupted mid-gen', color: 'bg-orange-100 text-orange-700' },
                { status: 'complete', desc: 'All pages generated', color: 'bg-green-100 text-green-700' },
                { status: 'failed', desc: 'Unrecoverable error', color: 'bg-red-100 text-red-700' },
                { status: 'cancelled', desc: 'Stopped by user/system', color: 'bg-gray-100 text-gray-500' },
              ].map(s => (
                <div key={s.status} className={`rounded-lg p-3 ${s.color}`}>
                  <p className="font-mono font-bold text-sm">{s.status}</p>
                  <p className="text-xs mt-0.5 opacity-80">{s.desc}</p>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500 font-mono bg-gray-50 rounded-lg p-3">
              queued → dispatched → generating → partial → complete<br />
              dispatched → failed | cancelled<br />
              generating → failed | partial → failed<br />
              failed: triggers books.status=&apos;failed&apos; + refund flow
            </div>
          </div>
        </section>

        {/* ── View Aliases ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">View Aliases (Canonical Names)</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Canonical Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Underlying Table</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Product UI Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  ['parents', 'profiles (role ∈ parent/teacher/admin)', '"Your account"'],
                  ['child_profiles', 'children', '"Your little ones"'],
                  ['prompts', 'stories', '"Your story"'],
                  ['coloring_pages', 'pages', '"Page [N]"'],
                  ['generation_jobs', '(native table)', '"Creating your book..."'],
                  ['moderation_events', '(native table)', '(internal only)'],
                ].map(([canonical, table, ui]) => (
                  <tr key={canonical} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-sm font-bold text-violet-700">{canonical}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600 font-mono">{table}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 italic">{ui}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── RLS Policies ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">RLS Policies ({policies.length})</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Table</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Policy</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cmd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {policies.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs text-violet-700">{p.tablename}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{p.policyname}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.cmd === 'ALL' ? 'bg-blue-100 text-blue-700' :
                        p.cmd === 'SELECT' ? 'bg-green-100 text-green-700' :
                        p.cmd === 'INSERT' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{p.cmd}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Functions ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Database Functions ({functions.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {functions.map(fn => {
              const desc: Record<string, string> = {
                set_updated_at: 'Trigger: set updated_at = now() on UPDATE',
                generate_referral_code: 'Trigger: auto-generate 8-char referral code on INSERT',
                soft_delete_account: 'Sets deleted_at on profile + children + books (30d grace)',
                hard_delete_expired_accounts: 'Nightly cron: cascade hard-delete after 30d grace',
                purge_expired_story_text: 'Nightly cron: clear stories.raw_text after 90d',
                purge_expired_job_prompts: 'Nightly cron: clear generation_jobs.input_prompt after 90d',
                purge_expired_moderation_text: 'Nightly cron: clear moderation_events.input_text_snippet after 90d',
                complete_generation_job: 'Worker: mark job complete, update book to preview_ready',
                fail_generation_job: 'Worker: mark job failed, update book to failed',
              }
              const isNew = ['complete_generation_job','fail_generation_job','purge_expired_job_prompts','purge_expired_moderation_text'].includes(fn.proname)
              return (
                <div key={fn.proname} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-bold text-violet-700">{fn.proname}()</code>
                    {isNew && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">★ NEW</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{desc[fn.proname] || 'Database function'}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Data Retention ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Data Retention Schedule</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Field</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Retention</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Mechanism</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  ['profiles.*', 'Until deletion + 30d', 'soft_delete_account() + hard_delete_expired_accounts()'],
                  ['children.*', 'Until parent deletes + 30d', 'Cascade from profiles deletion'],
                  ['stories.raw_text', '90d post-delivery', 'purge_expired_story_text() nightly'],
                  ['generation_jobs.input_prompt', '90d post-completion', 'purge_expired_job_prompts() nightly ★'],
                  ['moderation_events.input_text_snippet', '90d', 'purge_expired_moderation_text() nightly ★'],
                  ['events.*', '2 years', 'Manual archive process'],
                  ['books.*', '7 years', 'Financial records — soft-delete suppressed'],
                  ['moderation_events.*', '7 years', 'Compliance records — append-only, no delete'],
                ].map(([field, retention, mechanism]) => (
                  <tr key={field} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{field}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{retention}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{mechanism}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 px-4 py-2 border-t border-gray-50">★ = new in v1.0.0</p>
          </div>
        </section>

      </div>
    </div>
  )
}
