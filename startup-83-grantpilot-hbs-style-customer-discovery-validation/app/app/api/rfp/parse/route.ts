import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { createAdminClient } from '@/lib/supabase'
import { parseRFP } from '@/lib/rfp-parser'
import { logger, startTimer, logError } from '@/lib/logger'
import { getEntitlementState, logUsage, limitExceededResponse } from '@/lib/entitlements'
import { trackServer } from '@/lib/analytics.server'

// Max PDF size: 10MB
const MAX_FILE_BYTES = 10 * 1024 * 1024

export async function POST(req: NextRequest) {
  const timer = startTimer('rfp_parse')
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get org membership
    const admin = createAdminClient()
    const { data: member } = await admin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()
    if (!member) return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    const orgId = member.organization_id

    // ── Entitlement gate ──────────────────────────────────────────────────
    const ent = await getEntitlementState(user.id)
    if (!ent.can.parse_rfp) {
      return limitExceededResponse(
        'rfp_parse',
        ent.tier,
        ent.usage['rfp_parse'] || 0,
        ent.limits.rfp_parse_per_month
      )
    }
    // ─────────────────────────────────────────────────────────────────

    const contentType = req.headers.get('content-type') || ''
    let rawText = ''
    let fileName = 'rfp'
    let sourceType: 'pdf_upload' | 'url' | 'text_paste' = 'text_paste'
    let sourceUrl: string | null = null
    let fileSizeBytes = 0
    let filePath: string | null = null

    // ── PDF Upload ────────────────────────────────────────────────────────────
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const mode = formData.get('mode') as string | null

      if (mode === 'url') {
        const url = formData.get('url') as string
        if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })
        sourceType = 'url'
        sourceUrl = url
        const fetched = await fetchURL(url)
        rawText = fetched.text
        fileName = fetched.title || new URL(url).hostname
      } else if (file) {
        if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
        if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
          // Try as plain text
          rawText = await file.text()
        } else {
          // Parse PDF
          const buffer = Buffer.from(await file.arrayBuffer())
          rawText = await extractPDFText(buffer)
        }
        fileName = file.name.replace(/\.pdf$/i, '')
        sourceType = 'pdf_upload'
        fileSizeBytes = file.size

        // Upload to Supabase Storage
        const storagePath = `${orgId}/${Date.now()}-${file.name}`
        const { error: upErr } = await admin.storage.from('rfp-uploads').upload(storagePath, await file.arrayBuffer(), {
          contentType: file.type || 'application/pdf',
          upsert: false,
        })
        if (!upErr) filePath = storagePath
      } else if (formData.get('text')) {
        rawText = formData.get('text') as string
        sourceType = 'text_paste'
        fileName = (formData.get('title') as string) || 'Pasted RFP'
      } else {
        return NextResponse.json({ error: 'No file, URL, or text provided' }, { status: 400 })
      }
    } else {
      // JSON body with text/url
      const body = await req.json()
      if (body.url) {
        sourceType = 'url'
        sourceUrl = body.url
        const fetched = await fetchURL(body.url)
        rawText = fetched.text
        fileName = fetched.title || new URL(body.url).hostname
      } else if (body.text) {
        rawText = body.text
        sourceType = 'text_paste'
        fileName = body.title || 'Pasted RFP'
      } else {
        return NextResponse.json({ error: 'Provide url or text' }, { status: 400 })
      }
    }

    if (!rawText || rawText.trim().length < 100) {
      return NextResponse.json({ error: 'Could not extract text from source — minimum 100 characters needed' }, { status: 422 })
    }

    // ── Parse ─────────────────────────────────────────────────────────────────
    const parsed = parseRFP(rawText)

    // ── Save rfp_documents ────────────────────────────────────────────────────
    const { data: doc, error: docErr } = await admin.from('rfp_documents').insert({
      organization_id: orgId,
      created_by: user.id,
      title: parsed.title || fileName,
      funder_name: parsed.funder_name,
      program_name: parsed.program_name,
      cfda_number: parsed.cfda_number,
      source_type: sourceType,
      source_url: sourceUrl,
      file_path: filePath,
      file_size_bytes: fileSizeBytes || null,
      parse_status: 'complete',
      parsed_data: {
        ...parsed,
        raw_text_length: rawText.length,
        parsed_at: new Date().toISOString(),
      },
      deadline: parsed.deadline,
      portal_type: parsed.submission_portal,
    }).select('id').single()

    if (docErr) {
      console.error('rfp_documents insert error:', docErr)
      return NextResponse.json({ error: 'Failed to save RFP' }, { status: 500 })
    }

    // ── Save rfp_requirements ─────────────────────────────────────────────────
    if (parsed.required_sections.length > 0) {
      const reqRows = parsed.required_sections.map((s, i) => ({
        rfp_document_id: doc.id,
        organization_id: orgId,
        req_type: s.req_type,
        title: s.title,
        description: s.description,
        is_required: s.is_required,
        word_limit: s.word_limit,
        page_limit: s.page_limit,
        scoring_points: s.scoring_points,
        status: 'pending',
        sort_order: i,
      }))
      await admin.from('rfp_requirements').insert(reqRows)
    }

    // ── Auto-create grant_application ─────────────────────────────────────────
    const { data: app } = await admin.from('grant_applications').insert({
      organization_id: orgId,
      rfp_document_id: doc.id,
      created_by: user.id,
      title: parsed.title || fileName,
      funder_name: parsed.funder_name,
      program_name: parsed.program_name,
      cfda_number: parsed.cfda_number,
      deadline: parsed.deadline,
      ask_amount_usd: parsed.max_award_usd,
      status: 'drafting',
    }).select('id').single()

    // ── Auto-assign AI Pilot order ──────────────────────────────────────────
    let orderId: string | null = null
    if (app?.id) {
      try {
        const { data: aiPilot } = await admin.from('providers').select('id').eq('is_default_provider', true).eq('is_ai_pilot', true).single()
        if (aiPilot) {
          const deliverables = [
            { key: 'rfp_parse', label: 'RFP Analysis', status: 'complete' },
            { key: 'narrative', label: 'Narrative Draft', status: 'pending' },
            { key: 'budget', label: 'Budget Build', status: 'pending' },
            { key: 'forms', label: 'Forms & Checklist', status: 'pending' },
            { key: 'qa', label: 'QA Review', status: 'pending' },
            { key: 'export', label: 'Submission Package', status: 'pending' },
          ]
          const { data: order } = await admin.from('orders').insert({
            application_id: app.id, organization_id: orgId,
            provider_id: aiPilot.id, ordered_by: user.id, created_by: user.id,
            order_type: 'full_application', status: 'active',
            status_history: [{ status: 'active', step: 'rfp_parse', timestamp: new Date().toISOString(), note: 'AI Pilot auto-assigned on RFP import.', actor: 'system' }],
            current_step: 'narrative', progress_pct: 15,
            deliverables, price_usd: 0, price_model: 'free_tier',
          }).select('id').single()
          orderId = order?.id || null
        }
      } catch (e) { console.error('Auto-order error:', e) }
    }

    // Metered usage
    await logUsage(user.id, orgId, 'rfp_parse', 'rfp_document', doc.id, { sections: parsed.required_sections.length })
    // Analytics
    trackServer('rfp_parsed', user.id, orgId, {
      rfp_id: doc.id,
      sections_count: parsed.required_sections.length,
      confidence: parsed.confidence,
      source_type: doc.source_type,
      funder_name: parsed.funder_name,
    }).catch(() => {})

    return NextResponse.json({
      rfp_id: doc.id,
      application_id: app?.id || null,
      order_id: orderId,
      parsed,
      sections_count: parsed.required_sections.length,
      confidence: parsed.confidence,
      warnings: parsed.warnings,
    })

  } catch (err) {
    timer.error(err, { route: '/api/rfp/parse' })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function extractPDFText(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const result = await pdfParse(buffer)
    return result.text || ''
  } catch {
    // Fallback: return raw buffer as latin1 string (partial)
    return buffer.toString('latin1').replace(/[^\x20-\x7E\n\r\t]/g, ' ')
  }
}

async function fetchURL(url: string): Promise<{ text: string; title: string | null }> {
  // Basic fetch + HTML strip
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 GrantPilot/1.0 RFP-Fetcher' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  const ct = res.headers.get('content-type') || ''

  if (ct.includes('application/pdf')) {
    const buf = Buffer.from(await res.arrayBuffer())
    const text = await extractPDFText(buf)
    return { text, title: null }
  }

  const html = await res.text()
  // Extract title
  const titleM = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleM ? titleM[1].trim() : null
  // Strip HTML tags
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{3,}/g, '\n')
    .trim()
  return { text, title }
}
