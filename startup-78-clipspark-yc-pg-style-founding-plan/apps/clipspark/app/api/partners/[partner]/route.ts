import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { trackServer } from '@/lib/analytics'

/**
 * Partner import endpoints for Riverside, Zoom, and generic URL imports.
 * 
 * POST /api/partners/[partner]/import
 * Supported partners: riverside, zoom, generic
 * 
 * All partners ultimately create a processing_job with source_url
 * and log the integration in partner_integrations.
 */

const PARTNER_CONFIG: Record<string, { name: string; urlPatterns?: RegExp[] }> = {
  riverside: {
    name: 'Riverside.fm',
    urlPatterns: [/riverside\.fm/],
  },
  zoom: {
    name: 'Zoom',
    urlPatterns: [/zoom\.us/, /zoomgov\.com/],
  },
  squadcast: {
    name: 'Squadcast',
    urlPatterns: [/squadcast\.fm/],
  },
  zencastr: {
    name: 'Zencastr',
    urlPatterns: [/zencastr\.com/],
  },
  generic: {
    name: 'Direct URL',
  },
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ partner: string }> }
) {
  const { partner } = await params
  const config = PARTNER_CONFIG[partner]
  if (!config) {
    return NextResponse.json({ error: `Unknown partner: ${partner}` }, { status: 404 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { source_url, title, affiliate_code } = body

  if (!source_url?.trim()) {
    return NextResponse.json({ error: 'source_url required' }, { status: 400 })
  }

  // Validate URL
  let parsedUrl: URL
  try { parsedUrl = new URL(source_url) } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'URL must be http or https' }, { status: 400 })
  }

  // Validate URL matches expected partner domain (loose check, not strict)
  if (config.urlPatterns) {
    const domainOk = config.urlPatterns.some(p => p.test(source_url))
    // Only warn, don't block — URLs may vary
    if (!domainOk) {
      console.warn(`[partners/${partner}] URL domain may not match expected pattern:`, source_url)
    }
  }

  const svc = createServiceClient()

  // Create processing job
  const { data: job, error: jobError } = await svc
    .from('processing_jobs')
    .insert({
      user_id: user.id,
      source_url,
      source_type: 'url',
      title: title || `${config.name} Import`,
      status: 'pending',
      metadata: {
        partner,
        partner_name: config.name,
        affiliate_code: affiliate_code || null,
        imported_at: new Date().toISOString(),
      },
    })
    .select()
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message || 'Failed to create job' }, { status: 500 })
  }

  // Log partner integration
  await svc.from('partner_integrations').upsert({
    partner_slug: partner,
    partner_name: config.name,
    user_id: user.id,
    integration_type: 'import',
    affiliate_code: affiliate_code || null,
    last_used_at: new Date().toISOString(),
    total_imports: 1,
  }, { onConflict: 'partner_slug,user_id' })

  // Track affiliate click conversion
  if (affiliate_code) {
    await svc.from('affiliate_clicks').update({
      converted: true,
      converted_at: new Date().toISOString(),
    })
    .eq('affiliate_code', affiliate_code)
    .eq('converted', false)
    .limit(1)
  }

  trackServer(user.id, 'partner_import', {
    partner,
    job_id: job.id,
    has_affiliate: !!affiliate_code,
  })

  return NextResponse.json({
    job_id: job.id,
    partner,
    source_url,
    redirect_to: `/jobs/${job.id}`,
  }, { status: 201 })
}

// GET /api/partners/[partner] — partner info + user's import history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ partner: string }> }
) {
  const { partner } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: integration } = await supabase
    .from('partner_integrations')
    .select('*')
    .eq('partner_slug', partner)
    .eq('user_id', user.id)
    .single()

  // Recent jobs from this partner
  const svc = createServiceClient()
  const { data: recentJobs } = await svc
    .from('processing_jobs')
    .select('id, title, status, created_at')
    .eq('user_id', user.id)
    .contains('metadata', { partner })
    .order('created_at', { ascending: false })
    .limit(5)

  return NextResponse.json({
    partner,
    name: PARTNER_CONFIG[partner]?.name || partner,
    integration: integration || null,
    recent_imports: recentJobs || [],
  })
}
