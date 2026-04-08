import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import JSZip from 'jszip'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SourceRow {
  id: string
  claim_id: string
  doi?: string
  title?: string
  authors?: string[]
  year?: number
  journal?: string
  pmid?: string
  source_db?: string
  abstract_snippet?: string
  abstract_text?: string
  full_text_excerpt?: string
  oa_full_text_url?: string
  full_text_url?: string
  pdf_cached_url?: string
  study_type?: string
  citation_count?: number
  scite_support?: number
  scite_contrast?: number
  scite_mention?: number
  retracted?: boolean
  retraction_date?: string
  retraction_reason?: string
  access_status?: string
  mesh_terms?: string[]
  impact_factor?: number
  relevance_score?: number
}

interface ClaimRow {
  id: string
  text: string
  claim_type?: string
  confidence_score?: number
  confidence_band?: string
  evidence_count?: number
  risk_detail?: unknown
  extraction_method?: string
  position_index?: number
}

interface RiskFlagRow {
  claim_id: string
  flag_type: string
  severity: string
  detail: string
  suggestion?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeCSV(val: string | number | undefined | null): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s
}

/** Plain-language 1–2 sentence summary of a source for a given claim */
function buildPlainSummary(source: SourceRow, claimText: string): string {
  const excerpt = source.abstract_text || source.abstract_snippet || source.full_text_excerpt || ''
  const studyLabel = {
    meta_analysis: 'A meta-analysis', rct: 'A randomized controlled trial',
    cohort: 'A cohort study', review: 'A systematic review',
    case_study: 'A case study', preprint: 'A preprint study', other: 'A study',
  }[source.study_type || 'other'] || 'A study'
  const journalPart = source.journal ? ` published in ${source.journal}` : ''
  const yearPart = source.year ? ` (${source.year})` : ''
  const authorPart = source.authors?.[0] ? ` by ${source.authors[0].split(',')[0]} et al.` : ''
  const citePart = source.citation_count ? ` Cited ${source.citation_count} times.` : ''
  const scitePart = (source.scite_support || source.scite_contrast)
    ? ` Scite: ${source.scite_support || 0} supporting, ${source.scite_contrast || 0} contrasting.` : ''
  const retractNote = source.retracted ? ' ⚠️ NOTE: This source has been retracted.' : ''

  // Truncate excerpt to ~200 chars for a readable snippet
  const excerptSnippet = excerpt ? ` Excerpt: "${excerpt.slice(0, 200).replace(/\s+/g, ' ').trim()}${excerpt.length > 200 ? '…' : ''}"` : ''
  const claimSnippet = claimText.length > 80 ? claimText.slice(0, 80) + '…' : claimText

  return `${studyLabel}${authorPart}${journalPart}${yearPart} supports the claim: "${claimSnippet}".${excerptSnippet}${citePart}${scitePart}${retractNote}`
}

/** Determine if we have license permission to include a snapshot/PDF link */
function oaLinkPermitted(source: SourceRow): string | null {
  // Only include OA links — never paywalled content
  if (source.access_status === 'paywalled') return null
  if (source.retracted) return null
  const url = source.oa_full_text_url || source.full_text_url || source.pdf_cached_url || null
  return url
}

/** BibTeX cite key */
function bibtexKey(source: SourceRow, index: number): string {
  const firstAuthorFamily = (source.authors?.[0] || 'Unknown').split(',')[0]
    .replace(/[^a-zA-Z]/g, '').toLowerCase().slice(0, 12)
  const year = source.year || 'nd'
  return `${firstAuthorFamily}${year}_${index + 1}`
}

function buildBibtex(sources: SourceRow[]): string {
  return sources.map((s, i) => {
    const key = bibtexKey(s, i)
    const type = s.study_type === 'review' ? 'article' : 'article'
    const doiLine = s.doi ? `  doi = {${s.doi}},\n` : ''
    const pmidLine = s.pmid ? `  pmid = {${s.pmid}},\n` : ''
    const urlLine = oaLinkPermitted(s) ? `  url = {${oaLinkPermitted(s)}},\n` : ''
    const meshLine = s.mesh_terms?.length ? `  keywords = {${s.mesh_terms.join(', ')}},\n` : ''
    const note = s.retracted ? `  note = {RETRACTED ${s.retraction_date || ''}},\n` : ''
    return `@${type}{${key},
  title = {${(s.title || '').replace(/[{}]/g, '')}},
  author = {${(s.authors || ['Unknown']).join(' and ')}},
  year = {${s.year || ''}},
  journal = {${s.journal || ''}},
${doiLine}${pmidLine}${urlLine}${meshLine}${note}}`
  }).join('\n\n')
}

function buildVancouver(sources: SourceRow[]): string {
  return sources.map((s, i) => {
    const authors = (s.authors || []).slice(0, 6).map(a => {
      const parts = a.split(',')
      return parts.length > 1 ? `${parts[0].trim()} ${parts[1]?.trim()?.charAt(0) || ''}` : a.trim()
    }).join(', ') + ((s.authors?.length || 0) > 6 ? ', et al' : '')
    const doi = s.doi ? ` doi:${s.doi}` : ''
    const pmid = s.pmid ? ` PMID:${s.pmid}` : ''
    const retract = s.retracted ? ' [RETRACTED]' : ''
    return `${i + 1}. ${authors || 'Unknown'}. ${s.title || 'Unknown title'}. ${s.journal || ''}. ${s.year || ''};${doi}${pmid}${retract}`
  }).join('\n')
}

function buildAPA(sources: SourceRow[]): string {
  return sources.map((s, i) => {
    const authorStr = (s.authors || []).slice(0, 7).map(a => {
      const parts = a.split(',')
      const family = parts[0]?.trim() || 'Unknown'
      const initials = (parts[1]?.trim() || '').split(' ').map(w => w.charAt(0)).filter(Boolean).join('. ')
      return initials ? `${family}, ${initials}.` : family
    }).join(', ') + ((s.authors?.length || 0) > 7 ? ', …' : '')
    const doi = s.doi ? ` https://doi.org/${s.doi}` : ''
    return `${i + 1}. ${authorStr || 'Unknown.'} (${s.year || 'n.d.'}). ${s.title || 'Untitled'}. *${s.journal || ''}*.${doi}`
  }).join('\n\n')
}

function buildCSV(sources: SourceRow[], claimsById: Record<string, ClaimRow>): string {
  const header = 'Index,DOI,Title,Authors,Year,Journal,PMID,Study Type,Access Status,OA PDF URL,Scite Support,Scite Contrast,Citation Count,Impact Factor,Retracted,Claim (truncated)\n'
  const rows = sources.map((s, i) => {
    const claim = claimsById[s.claim_id]
    const oaUrl = oaLinkPermitted(s) || ''
    return [
      i + 1,
      escapeCSV(s.doi),
      escapeCSV(s.title),
      escapeCSV((s.authors || []).join('; ')),
      s.year || '',
      escapeCSV(s.journal),
      escapeCSV(s.pmid),
      escapeCSV(s.study_type),
      escapeCSV(s.access_status),
      escapeCSV(oaUrl),
      s.scite_support || 0,
      s.scite_contrast || 0,
      s.citation_count || '',
      s.impact_factor || '',
      s.retracted ? 'YES' : 'NO',
      escapeCSV(claim?.text?.slice(0, 80)),
    ].join(',')
  })
  return header + rows.join('\n')
}

function buildConfidenceReport(
  session: { id: string; title: string; audience_level?: string; territory?: string },
  claims: ClaimRow[],
  sources: SourceRow[],
  flags: RiskFlagRow[],
  exportedAt: string
): string {
  const flagsByClaim: Record<string, RiskFlagRow[]> = {}
  for (const f of flags) {
    if (!flagsByClaim[f.claim_id]) flagsByClaim[f.claim_id] = []
    flagsByClaim[f.claim_id].push(f)
  }

  const lines: string[] = [
    '╔══════════════════════════════════════════════════════════════════════╗',
    '║              CITEBUNDLE CONFIDENCE & PROVENANCE REPORT              ║',
    '╚══════════════════════════════════════════════════════════════════════╝',
    '',
    `Session  : ${session.title}`,
    `ID       : ${session.id}`,
    `Audience : ${session.audience_level || 'general'}`,
    `Territory: ${session.territory || 'general'}`,
    `Exported : ${exportedAt}`,
    `Source   : https://citebundle.com`,
    '',
    '═══ SUMMARY ══════════════════════════════════════════════════════════',
    `  Total claims    : ${claims.length}`,
    `  Total sources   : ${sources.length}`,
    `  High confidence : ${claims.filter(c => c.confidence_band === 'high').length}`,
    `  Moderate        : ${claims.filter(c => c.confidence_band === 'moderate').length}`,
    `  Low / none      : ${claims.filter(c => ['low', 'none', null, undefined].includes(c.confidence_band || null)).length}`,
    `  Risk flags      : ${flags.length} (${flags.filter(f => f.severity === 'critical').length} critical, ${flags.filter(f => f.severity === 'error').length} error)`,
    `  Retracted srcs  : ${sources.filter(s => s.retracted).length}`,
    `  OA full-text    : ${sources.filter(s => !!oaLinkPermitted(s)).length} sources`,
    '',
    '═══ CLAIMS & EVIDENCE ════════════════════════════════════════════════',
  ]

  for (const claim of claims) {
    const band = (claim.confidence_band || 'NONE').toUpperCase()
    const score = claim.confidence_score?.toFixed(3) || 'N/A'
    const claimSources = sources.filter(s => s.claim_id === claim.id)
    const claimFlags = flagsByClaim[claim.id] || []

    lines.push('')
    lines.push(`┌─ [${band} | ${score}] ${claim.claim_type || 'general'}`)
    lines.push(`│  ${claim.text}`)
    if (claimFlags.length > 0) {
      lines.push(`│  ⚑ FLAGS:`)
      for (const f of claimFlags) {
        lines.push(`│    [${f.severity.toUpperCase()}] ${f.flag_type}: ${f.detail}`)
        if (f.suggestion) lines.push(`│    → ${f.suggestion}`)
      }
    }
    if (claimSources.length === 0) {
      lines.push(`│  ✗ No supporting sources found`)
    } else {
      lines.push(`│  Sources (${claimSources.length}):`)
      for (const s of claimSources.slice(0, 5)) {
        const scite = (s.scite_support || s.scite_contrast)
          ? ` [Scite: ${s.scite_support || 0}↑ ${s.scite_contrast || 0}↓]` : ''
        const retractMark = s.retracted ? ' ⚠️RETRACTED' : ''
        const oaUrl = oaLinkPermitted(s)
        lines.push(`│    • ${s.title?.slice(0, 70) || 'Unknown title'}${retractMark}`)
        lines.push(`│      ${s.authors?.[0]?.split(',')[0] || 'Unknown'} et al. ${s.year || ''} · ${s.journal?.slice(0, 40) || ''} · ${s.study_type || ''}${scite}`)
        if (s.doi) lines.push(`│      DOI: ${s.doi}`)
        if (oaUrl) lines.push(`│      OA: ${oaUrl}`)
      }
      if (claimSources.length > 5) lines.push(`│    … and ${claimSources.length - 5} more`)
    }
    lines.push(`└${'─'.repeat(69)}`)
  }

  lines.push('')
  lines.push('═══ METHODOLOGY ══════════════════════════════════════════════════════')
  lines.push('  Claim extraction: AWS Bedrock (Claude Haiku) LLM with rule-based fallback')
  lines.push('  Evidence sources: PubMed Entrez + CrossRef REST + Unpaywall OA resolver')
  lines.push('  Citation quality: Scite.ai supporting/contrasting citation counts')
  lines.push('  Provenance score: 5-signal composite (source count, recency, study type,')
  lines.push('                    journal credibility, Scite ratio) + penalty deductions')
  lines.push('  Risk flagging:    Regulatory patterns (FDA/EMA), retraction detection,')
  lines.push('                    preprint-only, animal-study-only, unsupported claim')
  lines.push('')
  lines.push('  Score thresholds: High ≥ 0.70 · Moderate ≥ 0.45 · Low < 0.45')
  lines.push('')
  lines.push('  ⚠️  This report is for informational purposes. Claims and sources should')
  lines.push('      be reviewed by qualified subject-matter experts before publication.')
  lines.push('      Retracted sources must not be cited.')
  lines.push('')
  lines.push(`  Generated by ClaimCheck Studio · citebundle.com · ${exportedAt}`)

  return lines.join('\n')
}

function buildSourceExcerptsMarkdown(
  sources: SourceRow[],
  claimsById: Record<string, ClaimRow>
): string {
  const lines: string[] = [
    '# Source Excerpts',
    '',
    '> **License note:** Excerpts are reproduced for non-commercial review purposes.',
    '> Full-text links are provided for Open Access sources only.',
    '> Paywalled abstracts are truncated to ≤ 250 characters per fair-use guidance.',
    '',
  ]

  const grouped: Record<string, SourceRow[]> = {}
  for (const s of sources) {
    if (!grouped[s.claim_id]) grouped[s.claim_id] = []
    grouped[s.claim_id].push(s)
  }

  for (const [claimId, claimSources] of Object.entries(grouped)) {
    const claim = claimsById[claimId]
    if (!claim) continue
    lines.push(`## Claim: ${claim.text}`)
    lines.push(`*Type: ${claim.claim_type || 'general'} · Confidence: ${claim.confidence_band || 'N/A'} (${claim.confidence_score?.toFixed(3) || '—'})*`)
    lines.push('')

    for (const s of claimSources) {
      const oaUrl = oaLinkPermitted(s)
      const retractWarning = s.retracted
        ? `\n> ⚠️ **RETRACTED** ${s.retraction_date ? `(${s.retraction_date})` : ''}: ${s.retraction_reason || 'Reason not specified'}\n`
        : ''

      lines.push(`### ${s.title || 'Untitled'}`)
      lines.push(`**Authors:** ${(s.authors || ['Unknown']).slice(0, 4).join(', ')}${(s.authors?.length || 0) > 4 ? ' et al.' : ''}  `)
      lines.push(`**Year:** ${s.year || '—'} · **Journal:** ${s.journal || '—'} · **Study type:** ${s.study_type || '—'}  `)
      if (s.doi) lines.push(`**DOI:** [${s.doi}](https://doi.org/${s.doi})  `)
      if (s.pmid) lines.push(`**PubMed:** [${s.pmid}](https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/)  `)
      if (oaUrl) lines.push(`**Full text (OA):** [${oaUrl}](${oaUrl})  `)
      if (s.mesh_terms?.length) lines.push(`**MeSH:** ${s.mesh_terms.slice(0, 6).join(' · ')}  `)
      lines.push(retractWarning)

      // Excerpt
      const excerpt = s.full_text_excerpt || s.abstract_text || s.abstract_snippet
      if (excerpt) {
        const isOA = !!oaUrl
        const maxLen = isOA ? 600 : 250
        const truncated = excerpt.length > maxLen
        lines.push(`> ${excerpt.slice(0, maxLen).replace(/\n/g, '\n> ')}${truncated ? ' […excerpt truncated]' : ''}`)
      } else {
        lines.push(`> *No excerpt available.*`)
      }

      if (s.scite_support || s.scite_contrast) {
        lines.push(``)
        lines.push(`*Scite: ${s.scite_support || 0} supporting · ${s.scite_contrast || 0} contrasting · ${s.scite_mention || 0} mentioning*`)
      }
      lines.push('')
    }
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

function buildOAManifest(sources: SourceRow[], sessionTitle: string, exportedAt: string): string {
  const oaSources = sources.filter(s => !!oaLinkPermitted(s))
  const manifest = {
    generated: exportedAt,
    session: sessionTitle,
    license_note: 'Links are to Open Access full texts. No paywalled content is included. Snapshot links are provided as-is; availability depends on the hosting platform.',
    total_oa_sources: oaSources.length,
    sources: oaSources.map((s, i) => ({
      index: i + 1,
      title: s.title,
      doi: s.doi || null,
      pmid: s.pmid || null,
      year: s.year,
      journal: s.journal,
      oa_full_text_url: oaLinkPermitted(s),
      access_type: s.access_status || 'open',
      study_type: s.study_type,
      retracted: s.retracted || false,
    })),
  }
  return JSON.stringify(manifest, null, 2)
}

function buildReadme(
  session: { id: string; title: string },
  claims: ClaimRow[],
  sources: SourceRow[],
  exportedAt: string
): string {
  const oaCount = sources.filter(s => !!oaLinkPermitted(s)).length
  return `# CiteBundle — ${session.title}

Generated by [ClaimCheck Studio](https://citebundle.com) on ${exportedAt}

## Contents

| File | Description |
|------|-------------|
| \`confidence_report.txt\` | Full claim-by-claim provenance report with risk flags |
| \`citations.csv\` | Tabular source list (DOI, title, authors, year, study type, OA URL) |
| \`citations.bib\` | BibTeX references for all sources |
| \`citations_vancouver.txt\` | Vancouver-style numbered references |
| \`citations_apa.txt\` | APA 7th edition references |
| \`source_excerpts.md\` | Highlightable excerpts with OA links (where licensed) |
| \`oa_manifest.json\` | Open-access snapshot manifest (${oaCount} OA sources) |

## Summary

- **Claims extracted:** ${claims.length}
- **Sources found:** ${sources.length}
- **Open-access sources:** ${oaCount}
- **High-confidence claims:** ${claims.filter(c => c.confidence_band === 'high').length}
- **Moderate-confidence claims:** ${claims.filter(c => c.confidence_band === 'moderate').length}

## Methodology

Claims were extracted using LLM (AWS Bedrock / Claude Haiku) with a rule-based fallback.
Sources were retrieved from PubMed, CrossRef, and validated against Unpaywall for OA access.
Provenance scores use a 5-signal composite model (source count, recency, study type, journal credibility, Scite ratios).

## License

This CiteBundle is provided for review and content production purposes.
- Excerpts from open-access sources: reproduced under CC-BY or equivalent open licenses.
- Excerpts from paywalled sources: truncated per fair-use guidance (≤250 chars).
- Full-text snapshot links: open-access only; no paywalled PDFs are stored or linked.

---
Generated by ClaimCheck Studio · https://citebundle.com · hello@citebundle.com
Session ID: ${session.id}
`
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

// GET /api/sessions/[id]/export — JSON summary (for UI)
// GET /api/sessions/[id]/export?format=zip — full CiteBundle ZIP download
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const wantZip = request.nextUrl.searchParams.get('format') === 'zip'

  try {
    const supabase = getSupabaseAdmin()

    // ── Fetch session ──
    const { data: session, error: sessionError } = await supabase
      .from('cc_sessions')
      .select('id, title, audience_level, territory, claim_count, created_at')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // ── Fetch claims ──
    const { data: claims } = await supabase
      .from('claims')
      .select('id, text, claim_type, confidence_score, confidence_band, evidence_count, risk_detail, extraction_method, position_index')
      .eq('session_id', sessionId)
      .order('position_index', { ascending: true })

    const claimsById: Record<string, ClaimRow> = {}
    for (const c of claims || []) claimsById[c.id] = c

    // ── Fetch evidence sources ──
    const claimIds = (claims || []).map(c => c.id)
    const { data: sources } = claimIds.length > 0
      ? await supabase
          .from('evidence_sources')
          .select('id,claim_id,doi,title,authors,year,journal,pmid,source_db,abstract_snippet,abstract_text,full_text_excerpt,oa_full_text_url,full_text_url,pdf_cached_url,study_type,citation_count,scite_support,scite_contrast,scite_mention,retracted,retraction_date,retraction_reason,access_status,mesh_terms,impact_factor,relevance_score')
          .in('claim_id', claimIds)
          .is('deleted_at', null)
          .order('relevance_score', { ascending: false })
      : { data: [] }

    // ── Fetch risk flags ──
    const { data: flags } = claimIds.length > 0
      ? await supabase
          .from('cc_risk_flags')
          .select('claim_id,flag_type,severity,detail,suggestion')
          .in('claim_id', claimIds)
          .order('created_at', { ascending: true })
      : { data: [] }

    const exportedAt = new Date().toISOString()

    // ── Record audit trail ──
    await supabase.from('cc_audit_log').insert({
      session_id: sessionId,
      action: 'citebundle.exported',
      actor_type: 'user',
      details: {
        format: wantZip ? 'zip' : 'json',
        claim_count: claims?.length || 0,
        source_count: sources?.length || 0,
        oa_source_count: (sources || []).filter(s => !!oaLinkPermitted(s)).length,
        exported_at: exportedAt,
      },
    }).then(() => {}, () => {})

    // Also log to legacy tables
    await supabase.from('citebundle_exports').insert({
      session_id: sessionId,
      includes_csv: true,
      includes_bibtex: true,
      includes_vancouver: true,
      includes_excerpts: true,
      includes_confidence_report: true,
      source_count: sources?.length || 0,
      claim_count: claims?.length || 0,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).then(() => {}, () => {})

    await supabase.from('audit_events').insert({
      session_id: sessionId,
      event_type: 'citebundle.exported',
      event_data: {
        format: wantZip ? 'zip' : 'json',
        source_count: sources?.length || 0,
        claim_count: claims?.length || 0,
      },
    }).then(() => {}, () => {})

    // ── JSON response (for UI summary panel) ──
    if (!wantZip) {
      const csv = buildCSV(sources || [], claimsById)
      const bibtex = buildBibtex(sources || [])
      const vancouver = buildVancouver(sources || [])
      const confidenceReport = buildConfidenceReport(session, claims || [], sources || [], flags || [], exportedAt)

      return NextResponse.json({
        session: { id: session.id, title: session.title },
        summary: {
          totalClaims: claims?.length || 0,
          totalSources: sources?.length || 0,
          highConfidence: (claims || []).filter(c => c.confidence_band === 'high').length,
          moderateConfidence: (claims || []).filter(c => c.confidence_band === 'moderate').length,
          oaSources: (sources || []).filter(s => !!oaLinkPermitted(s)).length,
          criticalFlags: (flags || []).filter(f => f.severity === 'critical').length,
        },
        bundle: {
          csv,
          bibtex,
          vancouver,
          confidenceReport,
        },
      })
    }

    // ── ZIP response ──
    const zip = new JSZip()
    const safeTitle = (session.title || 'citebundle').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40)

    // README
    zip.file('README.md', buildReadme(session, claims || [], sources || [], exportedAt))

    // Confidence report
    zip.file('confidence_report.txt', buildConfidenceReport(session, claims || [], sources || [], flags || [], exportedAt))

    // CSV
    zip.file('citations.csv', buildCSV(sources || [], claimsById))

    // BibTeX
    zip.file('citations.bib', buildBibtex(sources || []))

    // Vancouver
    zip.file('citations_vancouver.txt', buildVancouver(sources || []))

    // APA
    zip.file('citations_apa.txt', buildAPA(sources || []))

    // Source excerpts markdown
    zip.file('source_excerpts.md', buildSourceExcerptsMarkdown(sources || [], claimsById))

    // OA manifest JSON
    zip.file('oa_manifest.json', buildOAManifest(sources || [], session.title, exportedAt))

    // Plain-language summaries per claim
    const summaryLines: string[] = [
      `# Plain-Language Source Summaries`,
      `# Session: ${session.title}`,
      `# Generated: ${exportedAt}`,
      '',
    ]
    for (const claim of claims || []) {
      summaryLines.push(`## ${claim.text}`)
      const claimSources = (sources || []).filter(s => s.claim_id === claim.id)
      if (claimSources.length === 0) {
        summaryLines.push('*No sources found for this claim.*')
      } else {
        for (const s of claimSources) {
          summaryLines.push(`- ${buildPlainSummary(s, claim.text)}`)
        }
      }
      summaryLines.push('')
    }
    zip.file('plain_language_summaries.md', summaryLines.join('\n'))

    // Audit trail
    const auditTrail = {
      exported_at: exportedAt,
      session_id: session.id,
      session_title: session.title,
      pipeline: {
        extraction_method: claims?.[0]?.extraction_method || 'unknown',
        evidence_sources: ['pubmed', 'crossref', 'unpaywall', 'scite'],
        provenance_model: 'v2-5signal',
        risk_flagging: 'v1-7categories',
      },
      claims_summary: {
        total: claims?.length || 0,
        high: (claims || []).filter(c => c.confidence_band === 'high').length,
        moderate: (claims || []).filter(c => c.confidence_band === 'moderate').length,
        low: (claims || []).filter(c => c.confidence_band === 'low').length,
      },
      sources_summary: {
        total: sources?.length || 0,
        oa_with_pdf: (sources || []).filter(s => !!oaLinkPermitted(s)).length,
        retracted: (sources || []).filter(s => s.retracted).length,
        study_types: Object.fromEntries(
          ['meta_analysis', 'rct', 'cohort', 'review', 'preprint', 'case_study', 'other']
            .map(t => [t, (sources || []).filter(s => s.study_type === t).length])
        ),
      },
      flags_summary: {
        total: flags?.length || 0,
        critical: (flags || []).filter(f => f.severity === 'critical').length,
        error: (flags || []).filter(f => f.severity === 'error').length,
        warning: (flags || []).filter(f => f.severity === 'warning').length,
      },
      files_included: [
        'README.md', 'confidence_report.txt', 'citations.csv',
        'citations.bib', 'citations_vancouver.txt', 'citations_apa.txt',
        'source_excerpts.md', 'oa_manifest.json',
        'plain_language_summaries.md', 'audit_trail.json',
      ],
      license_policy: 'OA sources only in oa_manifest.json and full excerpts. Paywalled abstracts truncated to ≤250 chars.',
    }
    zip.file('audit_trail.json', JSON.stringify(auditTrail, null, 2))

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
    const zipUint8 = new Uint8Array(zipBuffer)

    return new NextResponse(zipUint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="citebundle_${safeTitle}_${exportedAt.slice(0, 10)}.zip"`,
        'Content-Length': String(zipUint8.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('Export error:', err)
    return NextResponse.json({ error: 'Internal server error', detail: String(err) }, { status: 500 })
  }
}
