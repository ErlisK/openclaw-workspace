import { NextRequest, NextResponse } from 'next/server'
import { resolveAccess, loadConnectors } from '@/lib/access-layer'
import { emitTelemetry } from '@/lib/jobs'

/**
 * POST /api/access
 * Resolve full-text or abstract access for a DOI, using configured connectors.
 *
 * Body: { doi, pmid?, sessionId?, claimId?, orgId?, userId?, preferFullText? }
 *
 * Returns: AccessResult with licenseType, accessType, abstract, pdfUrl, snapshotId
 */
export async function POST(request: NextRequest) {
  const t0 = Date.now()
  try {
    const body = await request.json() as {
      doi: string
      pmid?: string
      sessionId?: string
      claimId?: string
      orgId?: string
      userId?: string
      preferFullText?: boolean
    }

    const { doi, pmid, sessionId, claimId, orgId, userId, preferFullText = false } = body
    if (!doi) return NextResponse.json({ error: 'doi required' }, { status: 400 })

    // Load connectors for this org/user
    const connectors = await loadConnectors(orgId || undefined, userId || undefined)

    // Resolve access
    const result = await resolveAccess({
      doi, pmid, sessionId, claimId, connectors, preferFullText,
    })

    await emitTelemetry({
      eventType: 'access.resolved',
      sessionId: sessionId || 'none',
      metadata: {
        doi,
        accessType: result.accessType,
        licenseType: result.licenseType,
        isOA: result.isOA,
        hasAbstract: !!result.abstract,
        connectorType: result.connectorType,
        snapshotId: result.snapshotId,
        elapsedMs: Date.now() - t0,
      },
    })

    return NextResponse.json({ result, elapsedMs: Date.now() - t0 })
  } catch (err) {
    console.error('Access resolution error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/**
 * GET /api/access?doi=xxx&sessionId=xxx
 * Check access status for a DOI without attempting full retrieval.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const doi = searchParams.get('doi')
  if (!doi) return NextResponse.json({ error: 'doi required' }, { status: 400 })

  const connectors = await loadConnectors()
  const result = await resolveAccess({ doi, connectors, preferFullText: false })
  return NextResponse.json({ result })
}
