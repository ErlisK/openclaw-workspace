/**
 * lib/access-layer.ts
 *
 * Institutional Access Layer v1
 *
 * Architecture:
 *   1. For a given DOI, try connectors in priority order:
 *      a. Unpaywall OA check (always first — free, no auth)
 *      b. User-configured connectors (EZProxy, bearer-token APIs, Elsevier/Springer/Wiley TDM)
 *   2. License gate: only store content permitted by license
 *      - CC-BY/CC0/OA → full text storage allowed
 *      - Subscriber/paywalled → metadata + abstract only
 *      - Unknown → metadata only, no storage
 *   3. Upload permitted content to Supabase Storage (cc-snapshots bucket)
 *      with versioning (storage_version auto-incremented per DOI)
 *   4. Write access audit log for every attempt (successful or not)
 *   5. Return structured AccessResult with resolved content + snapshot reference
 */

import { getSupabaseAdmin } from './supabase'

// ─── Types ─────────────────────────────────────────────────────────────────

export type ConnectorType =
  | 'unpaywall_email'
  | 'proxy_ezproxy'
  | 'bearer_token'
  | 'elsevier_tdm'
  | 'springer_nature'
  | 'wiley_tdm'
  | 'semantic_scholar'
  | 'ncbi_entrez'

export type LicenseType =
  | 'cc_by'           // CC-BY (any version) — storage allowed
  | 'cc_by_nc'        // CC-BY-NC — storage for non-commercial allowed
  | 'cc0'             // CC0 / public domain — storage allowed
  | 'open_access'     // OA but license not specified — abstract storage only
  | 'subscriber'      // Subscriber/institutional — metadata only
  | 'paywalled'       // No access without credential — metadata only
  | 'unknown'         // Could not determine — metadata only

export type AccessType = 'metadata' | 'abstract' | 'fulltext' | 'snapshot' | 'pdf_page'

export interface ConnectorConfig {
  id: string
  connectorType: ConnectorType
  displayName: string
  enabled: boolean
  priority: number
  authType: 'none' | 'email_param' | 'proxy_url' | 'bearer' | 'api_key'
  // Credentials (never returned to client)
  apiKey?: string
  proxyUrl?: string
  baseUrl?: string
  email?: string
  instToken?: string
}

export interface AccessResult {
  doi: string
  pmid?: string
  title?: string
  abstract?: string
  fullText?: string         // null unless license permits
  pdfUrl?: string           // OA PDF URL if found
  htmlUrl?: string
  licenseType: LicenseType
  licensePermitsStorage: boolean
  isOA: boolean
  accessType: AccessType    // what level we actually got
  connectorUsed?: string    // connector ID that succeeded
  connectorType?: ConnectorType
  snapshotId?: string       // cc_document_snapshots.id if stored
  snapshotPath?: string
  httpStatus?: number
  errorMessage?: string
}

// ─── License helpers ────────────────────────────────────────────────────────

function classifyLicense(licenseUrl: string | null | undefined): LicenseType {
  if (!licenseUrl) return 'unknown'
  const l = licenseUrl.toLowerCase()
  if (l.includes('creativecommons.org/publicdomain') || l.includes('cc0')) return 'cc0'
  if (l.includes('creativecommons.org/licenses/by/') || l === 'cc-by') return 'cc_by'
  if (l.includes('creativecommons.org/licenses/by-nc')) return 'cc_by_nc'
  if (l.includes('open') || l.includes('oa')) return 'open_access'
  return 'subscriber'
}

function licensePermitsStorage(lt: LicenseType): boolean {
  return lt === 'cc_by' || lt === 'cc0' || lt === 'cc_by_nc'
}

function licensePermitsFullText(lt: LicenseType): boolean {
  return lt === 'cc_by' || lt === 'cc0' || lt === 'cc_by_nc' || lt === 'open_access'
}

// ─── Unpaywall OA check ─────────────────────────────────────────────────────

interface UnpaywallResult {
  is_oa: boolean
  oa_locations: Array<{
    url_for_pdf?: string
    url_for_landing_page?: string
    license?: string
    host_type: string
    version?: string
  }>
  best_oa_location?: {
    url_for_pdf?: string
    url_for_landing_page?: string
    license?: string
  }
  genre?: string
  title?: string
  year?: number
  z_authors?: Array<{ family: string; given?: string }>
}

async function checkUnpaywall(doi: string, email: string): Promise<{
  isOA: boolean
  pdfUrl?: string
  htmlUrl?: string
  licenseType: LicenseType
  licenseUrl?: string
} | null> {
  const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`
  const resp = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!resp.ok) return null

  const data = await resp.json() as UnpaywallResult
  const bestLoc = data.best_oa_location
  const licenseUrl = bestLoc?.license || null
  const licenseType = classifyLicense(licenseUrl)

  return {
    isOA: data.is_oa,
    pdfUrl: bestLoc?.url_for_pdf || undefined,
    htmlUrl: bestLoc?.url_for_landing_page || undefined,
    licenseType: data.is_oa ? (licenseType === 'unknown' ? 'open_access' : licenseType) : 'paywalled',
    licenseUrl: licenseUrl || undefined,
  }
}

// ─── EZProxy connector ──────────────────────────────────────────────────────

async function fetchViaEZProxy(doi: string, proxyUrl: string): Promise<{
  content?: string
  contentType: string
  httpStatus: number
} | null> {
  // EZProxy: prepend proxy URL to the DOI resolver
  const doiUrl = `https://doi.org/${doi}`
  const proxiedUrl = `${proxyUrl.replace(/\/$/, '')}${doiUrl}`

  const resp = await fetch(proxiedUrl, {
    signal: AbortSignal.timeout(15000),
    headers: { 'User-Agent': 'ClaimCheck-Studio/1.0 (citebundle.com; access-verification)' },
  })

  const contentType = resp.headers.get('content-type') || 'text/html'
  if (!resp.ok) return { httpStatus: resp.status, contentType }

  const text = await resp.text()
  return { content: text, contentType, httpStatus: resp.status }
}

// ─── Elsevier TDM ──────────────────────────────────────────────────────────

async function fetchElsevierTDM(doi: string, apiKey: string, instToken?: string): Promise<{
  abstract?: string
  fullText?: string
  licenseType: LicenseType
  httpStatus: number
} | null> {
  const headers: Record<string, string> = {
    'X-ELS-APIKey': apiKey,
    'Accept': 'application/json',
    'User-Agent': 'ClaimCheck-Studio/1.0 (citebundle.com)',
  }
  if (instToken) headers['X-ELS-Insttoken'] = instToken

  // First try abstract
  const metaResp = await fetch(
    `https://api.elsevier.com/content/article/doi/${encodeURIComponent(doi)}?field=abstract,openaccess,openaccessFlag,openArchiveArticle`,
    { headers, signal: AbortSignal.timeout(10000) }
  )

  if (!metaResp.ok) return { httpStatus: metaResp.status, licenseType: 'unknown' }

  const meta = await metaResp.json() as {
    'full-text-retrieval-response'?: {
      coredata?: {
        'dc:description'?: string
        openaccess?: string
      }
    }
  }

  const coredata = meta['full-text-retrieval-response']?.coredata
  const abstract = coredata?.['dc:description']
  const isOA = coredata?.openaccess === '1'

  return {
    abstract,
    licenseType: isOA ? 'open_access' : 'subscriber',
    httpStatus: 200,
  }
}

// ─── Semantic Scholar ───────────────────────────────────────────────────────

async function fetchSemanticScholar(doi: string, apiKey?: string): Promise<{
  abstract?: string
  title?: string
  year?: number
  isOA: boolean
  openAccessPdfUrl?: string
  httpStatus: number
} | null> {
  const headers: Record<string, string> = { 'User-Agent': 'ClaimCheck-Studio/1.0' }
  if (apiKey) headers['x-api-key'] = apiKey

  const resp = await fetch(
    `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=title,abstract,year,isOpenAccess,openAccessPdf`,
    { headers, signal: AbortSignal.timeout(8000) }
  )

  if (!resp.ok) return { httpStatus: resp.status, isOA: false }

  const data = await resp.json() as {
    title?: string
    abstract?: string
    year?: number
    isOpenAccess?: boolean
    openAccessPdf?: { url?: string }
  }

  return {
    abstract: data.abstract,
    title: data.title,
    year: data.year,
    isOA: data.isOpenAccess || false,
    openAccessPdfUrl: data.openAccessPdf?.url,
    httpStatus: 200,
  }
}

// ─── Supabase Storage upload ─────────────────────────────────────────────────

async function uploadSnapshot(params: {
  sessionId: string
  doi: string
  content: string
  contentType: string
  connectorId: string
  licenseType: LicenseType
  isFullText: boolean
  highlightText?: string
}): Promise<{ snapshotId: string; storagePath: string } | null> {
  const supabase = getSupabaseAdmin()
  const { sessionId, doi, content, contentType, connectorId, licenseType, isFullText } = params

  // Check existing versions for this DOI
  const { data: existing } = await supabase
    .from('cc_document_snapshots')
    .select('storage_version')
    .eq('source_doi', doi)
    .eq('session_id', sessionId)
    .order('storage_version', { ascending: false })
    .limit(1)

  const version = existing?.[0] ? existing[0].storage_version + 1 : 1

  // Build storage path: sessions/{sessionId}/snapshots/{doi_slug}/v{version}.{ext}
  const doiSlug = doi.replace(/[^a-z0-9]/gi, '_').slice(0, 40)
  const ext = contentType.includes('html') ? 'html' : contentType.includes('pdf') ? 'pdf' : 'txt'
  const storagePath = `sessions/${sessionId}/snapshots/${doiSlug}/v${version}.${ext}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('cc-snapshots')
    .upload(storagePath, content, {
      contentType,
      upsert: false,   // never overwrite — each version is a new file
    })

  if (uploadError) {
    console.error('Snapshot upload failed:', uploadError.message)
    return null
  }

  // Record in cc_document_snapshots
  const { data: snapshot, error: dbError } = await supabase
    .from('cc_document_snapshots')
    .insert({
      session_id: sessionId,
      source_doi: doi,
      connector_id: connectorId,
      bucket: 'cc-snapshots',
      storage_path: storagePath,
      storage_version: version,
      content_type: contentType,
      file_size_bytes: new TextEncoder().encode(content).length,
      license_type: licenseType,
      license_permits_storage: licensePermitsStorage(licenseType),
      is_oa: licensePermitsFullText(licenseType),
      is_full_text: isFullText,
      highlight_text: params.highlightText,
    })
    .select('id')
    .single()

  if (dbError || !snapshot) {
    console.error('Snapshot DB record failed:', dbError?.message)
    return null
  }

  return { snapshotId: snapshot.id, storagePath }
}

// ─── Access audit ────────────────────────────────────────────────────────────

async function logAccess(params: {
  sessionId?: string
  claimId?: string
  connectorId?: string
  doi?: string
  pmid?: string
  accessType: AccessType
  accessGranted: boolean
  licenseType?: LicenseType
  connectorType?: ConnectorType
  httpStatus?: number
  responseMs?: number
  snapshotId?: string
}): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    await supabase.from('cc_access_audit').insert({
      session_id: params.sessionId || null,
      claim_id: params.claimId || null,
      connector_id: params.connectorId || null,
      doi: params.doi || null,
      pmid: params.pmid || null,
      access_type: params.accessType,
      access_granted: params.accessGranted,
      license_type: params.licenseType || 'unknown',
      license_permits_fulltext: licensePermitsFullText(params.licenseType || 'unknown'),
      connector_type: params.connectorType || null,
      http_status: params.httpStatus || null,
      response_ms: params.responseMs || null,
      stored_snapshot_id: params.snapshotId || null,
    })
  } catch (err) {
    console.error('Access audit log failed:', err)
  }
}

// ─── Main resolver ────────────────────────────────────────────────────────────

export async function resolveAccess(params: {
  doi: string
  pmid?: string
  sessionId?: string
  claimId?: string
  connectors: ConnectorConfig[]
  preferFullText?: boolean
}): Promise<AccessResult> {
  const { doi, pmid, sessionId, claimId, connectors, preferFullText = false } = params

  const result: AccessResult = {
    doi,
    pmid,
    licenseType: 'unknown',
    licensePermitsStorage: false,
    isOA: false,
    accessType: 'metadata',
  }

  // Sort connectors by priority
  const sorted = [...connectors]
    .filter(c => c.enabled)
    .sort((a, b) => a.priority - b.priority)

  const t0 = Date.now()

  // ── Step 1: Always try Unpaywall first (free OA check) ───────────────────
  const unpaywallConnector = sorted.find(c => c.connectorType === 'unpaywall_email')
  const unpaywall_email = unpaywallConnector?.email || 'api@citebundle.com'

  try {
    const oaResult = await checkUnpaywall(doi, unpaywall_email)
    if (oaResult) {
      result.isOA = oaResult.isOA
      result.licenseType = oaResult.licenseType
      result.licensePermitsStorage = licensePermitsStorage(oaResult.licenseType)
      result.pdfUrl = oaResult.pdfUrl
      result.htmlUrl = oaResult.htmlUrl
      result.connectorType = 'unpaywall_email'

      // If OA PDF available, fetch content
      if (oaResult.pdfUrl && preferFullText && licensePermitsFullText(oaResult.licenseType)) {
        try {
          const pdfResp = await fetch(oaResult.pdfUrl, { signal: AbortSignal.timeout(20000) })
          if (pdfResp.ok) {
            // We only store the PDF URL reference, not raw PDF bytes (no PDF parsing here)
            result.accessType = 'fulltext'
            await logAccess({
              sessionId, claimId,
              connectorId: unpaywallConnector?.id,
              doi, pmid,
              accessType: 'fulltext',
              accessGranted: true,
              licenseType: oaResult.licenseType,
              connectorType: 'unpaywall_email',
              httpStatus: pdfResp.status,
              responseMs: Date.now() - t0,
            })
            return result
          }
        } catch { /* PDF fetch failed, continue to abstract */ }
      }

      // If OA, try to get abstract via Semantic Scholar as well
      result.accessType = 'abstract'
    }
  } catch (err) {
    console.error('Unpaywall check failed:', err)
  }

  // ── Step 2: Try Semantic Scholar for abstract (free) ─────────────────────
  const ssConnector = sorted.find(c => c.connectorType === 'semantic_scholar')
  try {
    const ssResult = await fetchSemanticScholar(doi, ssConnector?.apiKey)
    if (ssResult && ssResult.abstract) {
      result.abstract = ssResult.abstract
      result.title = ssResult.title
      if (ssResult.isOA) {
        result.isOA = true
        result.pdfUrl = result.pdfUrl || ssResult.openAccessPdfUrl
        if (result.licenseType === 'unknown') result.licenseType = 'open_access'
      }
      result.accessType = 'abstract'
      result.connectorType = result.connectorType || 'semantic_scholar'

      await logAccess({
        sessionId, claimId,
        connectorId: ssConnector?.id,
        doi, pmid,
        accessType: 'abstract',
        accessGranted: true,
        licenseType: result.licenseType,
        connectorType: 'semantic_scholar',
        httpStatus: ssResult.httpStatus,
        responseMs: Date.now() - t0,
      })
    }
  } catch (err) {
    console.error('Semantic Scholar failed:', err)
  }

  // ── Step 3: Try institutional connectors for full text ───────────────────
  if (preferFullText) {
    for (const connector of sorted) {
      if (connector.connectorType === 'unpaywall_email' ||
          connector.connectorType === 'semantic_scholar') continue

      const tConnector = Date.now()

      try {
        let content: string | undefined
        let contentType = 'text/html'
        let httpStatus = 0
        let lt: LicenseType = result.licenseType

        switch (connector.connectorType) {
          case 'proxy_ezproxy': {
            if (!connector.proxyUrl) break
            const r = await fetchViaEZProxy(doi, connector.proxyUrl)
            if (r?.content && r.httpStatus < 400) {
              content = r.content
              contentType = r.contentType
              httpStatus = r.httpStatus
              // EZProxy doesn't tell us license — use existing determination
            }
            httpStatus = r?.httpStatus || 0
            break
          }

          case 'elsevier_tdm': {
            if (!connector.apiKey) break
            const r = await fetchElsevierTDM(doi, connector.apiKey, connector.instToken)
            if (r) {
              if (r.abstract && !result.abstract) result.abstract = r.abstract
              lt = r.licenseType
              httpStatus = r.httpStatus
              // Elsevier TDM: subscriber articles — only store abstract if license permits
              if (r.abstract && r.licenseType === 'open_access') {
                content = r.abstract
                contentType = 'text/plain'
              }
            }
            break
          }

          default:
            break
        }

        if (content) {
          // License gate: only store if permitted
          const storagePermitted = licensePermitsStorage(lt)
          let snapshotRef: { snapshotId: string; storagePath: string } | null = null

          if (storagePermitted && sessionId) {
            snapshotRef = await uploadSnapshot({
              sessionId,
              doi,
              content: content.slice(0, 500_000), // max 500KB
              contentType,
              connectorId: connector.id,
              licenseType: lt,
              isFullText: contentType !== 'text/plain',
            })
          }

          result.accessType = storagePermitted ? 'fulltext' : 'abstract'
          result.connectorUsed = connector.id
          result.connectorType = connector.connectorType
          result.licenseType = lt
          result.licensePermitsStorage = storagePermitted
          if (snapshotRef) {
            result.snapshotId = snapshotRef.snapshotId
            result.snapshotPath = snapshotRef.storagePath
          }

          await logAccess({
            sessionId, claimId,
            connectorId: connector.id,
            doi, pmid,
            accessType: storagePermitted ? 'fulltext' : 'abstract',
            accessGranted: true,
            licenseType: lt,
            connectorType: connector.connectorType,
            httpStatus,
            responseMs: Date.now() - tConnector,
            snapshotId: snapshotRef?.snapshotId,
          })

          break // Stop after first successful full-text connector
        } else {
          await logAccess({
            sessionId, claimId,
            connectorId: connector.id,
            doi, pmid,
            accessType: 'metadata',
            accessGranted: false,
            licenseType: lt,
            connectorType: connector.connectorType,
            httpStatus,
            responseMs: Date.now() - tConnector,
          })
        }
      } catch (err) {
        console.error(`Connector ${connector.connectorType} failed:`, err)
        // Update connector error rate
        try {
          await getSupabaseAdmin()
            .from('cc_connectors')
            .update({
              last_error: String(err),
              error_rate: 0.1, // bump error rate (simplified)
            })
            .eq('id', connector.id)
        } catch { /* non-fatal */ }
      }
    }
  }

  return result
}

// ─── Load user connectors from DB ─────────────────────────────────────────────

export async function loadConnectors(orgId?: string, userId?: string): Promise<ConnectorConfig[]> {
  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('cc_connectors')
    .select('id, connector_type, display_name, enabled, priority, config, auth_type, proxy_url, metadata_only, allowed_storage')
    .eq('enabled', true)
    .order('priority', { ascending: true })

  if (orgId) query = query.eq('org_id', orgId)
  else if (userId) query = query.eq('user_id', userId)

  const { data: connectors } = await query

  // Always include Semantic Scholar (free)
  const configs: ConnectorConfig[] = [{
    id: 'builtin-ss',
    connectorType: 'semantic_scholar',
    displayName: 'Semantic Scholar (built-in)',
    enabled: true,
    priority: 5,
    authType: 'none',
  }]

  for (const c of connectors || []) {
    const cfg = (c.config || {}) as Record<string, string>
    configs.push({
      id: c.id,
      connectorType: c.connector_type as ConnectorType,
      displayName: c.display_name,
      enabled: c.enabled,
      priority: c.priority,
      authType: (c.auth_type || 'none') as ConnectorConfig['authType'],
      apiKey: cfg.api_key,
      proxyUrl: c.proxy_url || cfg.proxy_url,
      baseUrl: cfg.base_url,
      email: cfg.email,
      instToken: cfg.inst_token,
    })
  }

  return configs
}

// ─── Connector validation ─────────────────────────────────────────────────────

export async function testConnector(connector: ConnectorConfig, testDoi = '10.1038/nature12373'): Promise<{
  success: boolean
  message: string
  responseMs: number
  accessType?: AccessType
  licenseType?: LicenseType
}> {
  const t0 = Date.now()

  try {
    const result = await resolveAccess({
      doi: testDoi,
      connectors: [connector],
      preferFullText: false,
    })

    return {
      success: result.accessType !== 'metadata' || result.isOA,
      message: `Accessed: ${result.accessType} | License: ${result.licenseType} | OA: ${result.isOA}`,
      responseMs: Date.now() - t0,
      accessType: result.accessType,
      licenseType: result.licenseType,
    }
  } catch (err) {
    return {
      success: false,
      message: String(err),
      responseMs: Date.now() - t0,
    }
  }
}
