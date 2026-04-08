/**
 * Evidence Search — PubMed Entrez + CrossRef (free APIs)
 * Searches for peer-reviewed sources supporting each claim.
 */

export interface EvidenceSource {
  doi?: string
  title: string
  authors: string[]
  year?: number
  journal?: string
  pmid?: string
  sourceDb: 'pubmed' | 'crossref'
  abstractSnippet?: string
  studyType: 'meta_analysis' | 'rct' | 'cohort' | 'case_study' | 'review' | 'other'
  citationCount?: number
  oaFullTextUrl?: string
  accessStatus: 'open' | 'paywalled' | 'unknown'
}

// Extract search terms from claim text
function buildSearchQuery(claim: string): string {
  // Remove common words, keep biomedical/scientific terms
  const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been', 'has', 'have', 'had', 'that', 'this', 'which', 'who', 'can', 'may', 'might', 'should', 'would', 'could', 'will', 'than', 'more', 'less'])

  const terms = claim
    .toLowerCase()
    .replace(/[^a-z0-9\s%-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 3 && !stopwords.has(t))
    .slice(0, 8)  // max 8 terms for specificity

  return terms.join(' ')
}

// Infer study type from title/abstract
function inferStudyType(title: string, abstract?: string): EvidenceSource['studyType'] {
  const text = `${title} ${abstract || ''}`.toLowerCase()
  if (/meta-analysis|systematic review/.test(text)) return 'meta_analysis'
  if (/randomized|randomised|rct|controlled trial/.test(text)) return 'rct'
  if (/cohort|prospective|longitudinal|follow-up study/.test(text)) return 'cohort'
  if (/case report|case series|case study/.test(text)) return 'case_study'
  if (/review|overview|summary/.test(text)) return 'review'
  return 'other'
}

// Search PubMed via Entrez E-utilities (free, no key needed for <3 req/sec)
export async function searchPubMed(claim: string, maxResults = 5): Promise<EvidenceSource[]> {
  const query = buildSearchQuery(claim)
  if (!query) return []

  try {
    // Search step: get PMIDs
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&sort=relevance`
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'ClaimCheckStudio/1.0 (hello@citebundle.com)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!searchRes.ok) return []
    const searchData = await searchRes.json()
    const pmids: string[] = searchData.esearchresult?.idlist || []
    if (pmids.length === 0) return []

    // Fetch step: get article details
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=json`
    const fetchRes = await fetch(fetchUrl, {
      headers: { 'User-Agent': 'ClaimCheckStudio/1.0 (hello@citebundle.com)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!fetchRes.ok) return []
    const fetchData = await fetchRes.json()
    const result = fetchData.result || {}

    const sources: EvidenceSource[] = []
    for (const pmid of pmids) {
      const article = result[pmid]
      if (!article || article.error) continue

      const authors = (article.authors || []).slice(0, 3).map((a: { name: string }) => a.name)
      const year = article.pubdate ? parseInt(article.pubdate.slice(0, 4)) : undefined
      const title = article.title || 'Untitled'
      const journal = article.source || undefined
      const doi = article.articleids?.find((a: { idtype: string; value: string }) => a.idtype === 'doi')?.value

      sources.push({
        doi,
        title,
        authors,
        year,
        journal,
        pmid,
        sourceDb: 'pubmed',
        studyType: inferStudyType(title),
        accessStatus: 'unknown',
        oaFullTextUrl: doi ? `https://unpaywall.org/${doi}` : undefined,
      })
    }
    return sources
  } catch {
    return []
  }
}

// Search CrossRef (free, generous rate limits)
export async function searchCrossRef(claim: string, maxResults = 3): Promise<EvidenceSource[]> {
  const query = buildSearchQuery(claim)
  if (!query) return []

  try {
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${maxResults}&filter=type:journal-article&select=DOI,title,author,published,container-title,is-referenced-by-count,link`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ClaimCheckStudio/1.0 (mailto:hello@citebundle.com)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const items = data.message?.items || []

    return items.map((item: {
      DOI?: string
      title?: string[]
      author?: Array<{ given?: string; family?: string }>
      published?: { 'date-parts'?: number[][] }
      'container-title'?: string[]
      'is-referenced-by-count'?: number
      link?: Array<{ 'content-type'?: string; URL?: string }>
    }) => {
      const authors = (item.author || []).slice(0, 3).map((a: { given?: string; family?: string }) => `${a.family || ''}, ${a.given || ''}`.trim())
      const year = item.published?.['date-parts']?.[0]?.[0]
      const title = item.title?.[0] || 'Untitled'
      const journal = item['container-title']?.[0]
      const oaUrl = item.link?.find((l: { 'content-type'?: string }) => l['content-type'] === 'application/pdf')?.URL

      return {
        doi: item.DOI,
        title,
        authors,
        year,
        journal,
        sourceDb: 'crossref' as const,
        studyType: inferStudyType(title),
        citationCount: item['is-referenced-by-count'],
        oaFullTextUrl: oaUrl,
        accessStatus: oaUrl ? 'open' as const : 'unknown' as const,
      }
    })
  } catch {
    return []
  }
}

// Combined search: PubMed + CrossRef, deduplicated by DOI
export async function searchEvidence(claim: string): Promise<EvidenceSource[]> {
  const [pubmedResults, crossrefResults] = await Promise.all([
    searchPubMed(claim, 5),
    searchCrossRef(claim, 3),
  ])

  const allSources = [...pubmedResults, ...crossrefResults]
  const seen = new Set<string>()
  const deduped: EvidenceSource[] = []

  for (const source of allSources) {
    const key = source.doi || `${source.title}-${source.year}`
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(source)
    }
  }

  return deduped.slice(0, 8)
}
