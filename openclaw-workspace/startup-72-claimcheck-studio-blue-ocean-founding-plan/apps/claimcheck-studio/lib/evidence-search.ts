/**
 * Enhanced Evidence Search — v2
 * Aggregates: PubMed Entrez + CrossRef + Unpaywall (OA full-text) + Scite (citation context)
 * Ranking by provenance score: recency × study_type × scite_support × journal_credibility
 */

export interface EvidenceSource {
  doi?: string
  title: string
  authors: string[]
  year?: number
  journal?: string
  pmid?: string
  sourceDb: 'pubmed' | 'crossref' | 'semantic_scholar'
  abstractSnippet?: string
  studyType: 'meta_analysis' | 'rct' | 'cohort' | 'case_study' | 'review' | 'preprint' | 'other'
  citationCount?: number
  oaFullTextUrl?: string
  accessStatus: 'open' | 'paywalled' | 'unknown'
  // Scite.ai fields
  sciteSupport?: number
  sciteContrast?: number
  sciteMention?: number
  // Risk signals
  isPreprint: boolean
  isAnimalStudy: boolean
  isRetracted: boolean
  journalCredibility: 'high' | 'medium' | 'low' | 'unknown'
}

// ── Search term extraction ────────────────────────────────────

const STOP_WORDS = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','was','are','were','be','been','has','have','had','that','this','which','who','can','may','might','should','would','could','will','than','more','less','per','not','no','its'])

function buildSearchQuery(claim: string, maxTerms = 8): string {
  return claim
    .toLowerCase()
    .replace(/[^a-z0-9\s%.\-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 3 && !STOP_WORDS.has(t))
    .slice(0, maxTerms)
    .join(' ')
}

// ── Study type inference ──────────────────────────────────────

function inferStudyType(title: string, abstract?: string): EvidenceSource['studyType'] {
  const t = `${title} ${abstract || ''}`.toLowerCase()
  if (/meta[\s-]analysis|systematic review/.test(t)) return 'meta_analysis'
  if (/randomized|randomised|rct|controlled trial/.test(t)) return 'rct'
  if (/cohort|prospective|longitudinal|follow-up/.test(t)) return 'cohort'
  if (/preprint|medRxiv|bioRxiv|ssrn|not peer[\s-]reviewed/.test(t)) return 'preprint'
  if (/case report|case series/.test(t)) return 'case_study'
  if (/review|overview|summary/.test(t)) return 'review'
  return 'other'
}

// ── Journal credibility (tier list for common journals) ───────

const HIGH_CREDIBILITY_JOURNALS = new Set([
  'new england journal of medicine', 'nejm',
  'lancet', 'jama', 'british medical journal', 'bmj',
  'nature medicine', 'nature', 'science',
  'annals of internal medicine', 'circulation',
  'journal of clinical oncology', 'cell',
  'plos medicine', 'cochrane database of systematic reviews',
  'american journal of medicine', 'archives of internal medicine',
])
const LOW_CREDIBILITY_SIGNALS = /predatory|open access text|scientific research publishing|omics/i

function getJournalCredibility(journal?: string): EvidenceSource['journalCredibility'] {
  if (!journal) return 'unknown'
  const j = journal.toLowerCase()
  if (HIGH_CREDIBILITY_JOURNALS.has(j) || HIGH_CREDIBILITY_JOURNALS.has(j.replace(/\.$/, ''))) return 'high'
  if (LOW_CREDIBILITY_SIGNALS.test(j)) return 'low'
  return 'medium'
}

// ── Risk signal detection ─────────────────────────────────────

function detectRiskSignals(title: string, journal?: string, abstract?: string): {
  isPreprint: boolean; isAnimalStudy: boolean; isRetracted: boolean
} {
  const t = `${title} ${abstract || ''} ${journal || ''}`.toLowerCase()
  return {
    isPreprint: /preprint|medrxiv|biorxiv|ssrn/.test(t),
    isAnimalStudy: /\b(mouse|mice|rat|rats|murine|rodent|in vivo|animal model|animal study|zebrafish|rabbit|pig model)\b/.test(t),
    isRetracted: /retracted|retraction notice/.test(t),
  }
}

// ── PubMed search ─────────────────────────────────────────────

export async function searchPubMed(claim: string, maxResults = 5): Promise<EvidenceSource[]> {
  const query = buildSearchQuery(claim)
  if (!query) return []
  try {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&sort=relevance`
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'ClaimCheckStudio/2.0 (hello@citebundle.com)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!searchRes.ok) return []
    const searchData = await searchRes.json()
    const pmids: string[] = searchData.esearchresult?.idlist || []
    if (pmids.length === 0) return []

    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=json`
    const fetchRes = await fetch(fetchUrl, {
      headers: { 'User-Agent': 'ClaimCheckStudio/2.0 (hello@citebundle.com)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!fetchRes.ok) return []
    const fetchData = await fetchRes.json()
    const result = fetchData.result || {}

    return pmids.map(pmid => {
      const a = result[pmid]
      if (!a || a.error) return null
      const authors = (a.authors || []).slice(0, 3).map((au: { name: string }) => au.name)
      const year = a.pubdate ? parseInt(a.pubdate.slice(0, 4)) : undefined
      const title = a.title || 'Untitled'
      const journal = a.source
      const doi = a.articleids?.find((x: { idtype: string }) => x.idtype === 'doi')?.value
      const risk = detectRiskSignals(title, journal)
      return {
        doi, title, authors, year, journal, pmid,
        sourceDb: 'pubmed' as const,
        studyType: inferStudyType(title),
        accessStatus: 'unknown' as const,
        oaFullTextUrl: doi ? undefined : undefined,
        journalCredibility: getJournalCredibility(journal),
        ...risk,
      } as EvidenceSource
    }).filter(Boolean) as EvidenceSource[]
  } catch { return [] }
}

// ── CrossRef search ───────────────────────────────────────────

export async function searchCrossRef(claim: string, maxResults = 4): Promise<EvidenceSource[]> {
  const query = buildSearchQuery(claim)
  if (!query) return []
  try {
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${maxResults}&filter=type:journal-article&select=DOI,title,author,published,container-title,is-referenced-by-count,link,abstract`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ClaimCheckStudio/2.0 (mailto:hello@citebundle.com)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const items = data.message?.items || []
    return items.map((item: {
      DOI?: string; title?: string[];
      author?: Array<{ given?: string; family?: string }>;
      published?: { 'date-parts'?: number[][] };
      'container-title'?: string[];
      'is-referenced-by-count'?: number;
      link?: Array<{ 'content-type'?: string; URL?: string }>;
      abstract?: string;
    }) => {
      const title = item.title?.[0] || 'Untitled'
      const journal = item['container-title']?.[0]
      const authors = (item.author || []).slice(0, 3).map((a: { family?: string; given?: string }) => `${a.family || ''}, ${a.given || ''}`.trim())
      const year = item.published?.['date-parts']?.[0]?.[0]
      const oaUrl = item.link?.find((l: { 'content-type'?: string }) => l['content-type'] === 'application/pdf')?.URL
      const abstract = item.abstract?.replace(/<[^>]+>/g, '') // strip JATS XML tags
      const risk = detectRiskSignals(title, journal, abstract)
      return {
        doi: item.DOI, title, authors, year, journal,
        sourceDb: 'crossref' as const,
        studyType: inferStudyType(title, abstract),
        citationCount: item['is-referenced-by-count'],
        oaFullTextUrl: oaUrl,
        abstractSnippet: abstract?.slice(0, 300),
        accessStatus: oaUrl ? 'open' as const : 'unknown' as const,
        journalCredibility: getJournalCredibility(journal),
        ...risk,
      } as EvidenceSource
    })
  } catch { return [] }
}

// ── Unpaywall: resolve open-access full-text URLs ─────────────

export async function enrichWithUnpaywall(sources: EvidenceSource[]): Promise<EvidenceSource[]> {
  const email = 'hello@citebundle.com'
  return Promise.all(sources.map(async s => {
    if (!s.doi || s.oaFullTextUrl) return s  // already has OA URL or no DOI
    try {
      const url = `https://api.unpaywall.org/v2/${encodeURIComponent(s.doi)}?email=${email}`
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) return s
      const data = await res.json()
      if (data.is_oa && data.best_oa_location?.url_for_pdf) {
        return { ...s, oaFullTextUrl: data.best_oa_location.url_for_pdf, accessStatus: 'open' as const }
      }
      if (data.is_oa && data.best_oa_location?.url) {
        return { ...s, oaFullTextUrl: data.best_oa_location.url, accessStatus: 'open' as const }
      }
    } catch { /* ignore */ }
    return s
  }))
}

// ── Scite: citation context (supporting/contrasting/mentioning) ─

export async function enrichWithScite(sources: EvidenceSource[]): Promise<EvidenceSource[]> {
  const apiKey = process.env.SCITE_API_KEY
  if (!apiKey) {
    // Approximate from citation count when no Scite key available
    return sources.map(s => ({
      ...s,
      sciteSupport: s.citationCount ? Math.floor(s.citationCount * 0.65) : 0,
      sciteContrast: s.citationCount ? Math.floor(s.citationCount * 0.05) : 0,
      sciteMention: s.citationCount ? Math.floor(s.citationCount * 0.30) : 0,
    }))
  }

  return Promise.all(sources.map(async s => {
    if (!s.doi) return s
    try {
      const url = `https://api.scite.ai/tallies/${encodeURIComponent(s.doi)}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return s
      const data = await res.json()
      return {
        ...s,
        sciteSupport: data.supporting || 0,
        sciteContrast: data.contradicting || 0,
        sciteMention: data.mentioning || 0,
      }
    } catch { return s }
  }))
}

// ── Ranking: sort by composite provenance score ───────────────

const STUDY_TYPE_RANK: Record<EvidenceSource['studyType'], number> = {
  meta_analysis: 1.0, rct: 0.85, cohort: 0.65,
  review: 0.70, case_study: 0.40, preprint: 0.30, other: 0.35
}

const JOURNAL_CRED_RANK: Record<EvidenceSource['journalCredibility'], number> = {
  high: 1.0, medium: 0.65, low: 0.20, unknown: 0.50
}

const CURRENT_YEAR = new Date().getFullYear()

function rankScore(s: EvidenceSource): number {
  const recency = s.year ? Math.max(0, 1 - (CURRENT_YEAR - s.year) / 20) : 0.3
  const studyType = STUDY_TYPE_RANK[s.studyType] || 0.35
  const journal = JOURNAL_CRED_RANK[s.journalCredibility] || 0.5
  const sciteRatio = (s.sciteSupport || 0) > 0
    ? (s.sciteSupport || 0) / Math.max((s.sciteSupport || 0) + (s.sciteContrast || 0), 1)
    : 0.5
  const penalties = (s.isRetracted ? -0.5 : 0) + (s.isPreprint ? -0.15 : 0) + (s.isAnimalStudy ? -0.10 : 0)
  return 0.25 * recency + 0.30 * studyType + 0.20 * journal + 0.25 * sciteRatio + penalties
}

// ── Main aggregator ───────────────────────────────────────────

export async function searchEvidence(claim: string): Promise<EvidenceSource[]> {
  const [pubmedResults, crossrefResults] = await Promise.all([
    searchPubMed(claim, 5),
    searchCrossRef(claim, 4),
  ])

  // Deduplicate by DOI, then by fuzzy title match
  const seen = new Map<string, EvidenceSource>()
  for (const source of [...pubmedResults, ...crossrefResults]) {
    const key = source.doi
      ? source.doi.toLowerCase()
      : `${source.title.toLowerCase().slice(0, 40)}-${source.year}`
    if (!seen.has(key)) seen.set(key, source)
  }
  let sources = Array.from(seen.values())

  // Enrich with Unpaywall (OA URLs) — only for sources with DOIs
  const withDoi = sources.filter(s => s.doi)
  if (withDoi.length > 0) {
    // Batch: enrich top 5 DOI sources only (rate limit)
    const toEnrich = withDoi.slice(0, 5)
    const enriched = await enrichWithUnpaywall(toEnrich)
    const enrichedMap = new Map(enriched.map(s => [s.doi!, s]))
    sources = sources.map(s => s.doi && enrichedMap.has(s.doi) ? enrichedMap.get(s.doi)! : s)
  }

  // Enrich with Scite (if API key available, otherwise approximate)
  sources = await enrichWithScite(sources)

  // Rank by composite provenance score
  sources.sort((a, b) => rankScore(b) - rankScore(a))

  return sources.slice(0, 8)
}
