import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

const VALID_TIERS = ['quick', 'standard', 'deep']
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await request.json()
  const { url, flow_description, tier } = body

  // Validate URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'URL must use HTTP or HTTPS' }, { status: 400 })
    }
    if (BLOCKED_HOSTS.some(h => parsedUrl.hostname.includes(h))) {
      return NextResponse.json({ error: 'Local URLs are not supported' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  if (!flow_description || flow_description.trim().length < 20) {
    return NextResponse.json({ error: 'Flow description must be at least 20 characters' }, { status: 400 })
  }

  if (!VALID_TIERS.includes(tier)) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  }

  // Use admin client to insert (bypass RLS for server-side creation)
  const admin = createAdminClient()
  const { data: job, error } = await admin
    .from('test_jobs')
    .insert({
      url: parsedUrl.toString(),
      flow_description: flow_description.trim(),
      tier,
      buyer_email: user.email,
      buyer_id: user.id,
      status: 'queued',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Job creation error:', error)
    return NextResponse.json({ error: 'Failed to create test job' }, { status: 500 })
  }

  return NextResponse.json({ job_id: job.id, status: 'queued' }, { status: 201 })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { data: jobs, error } = await supabase
    .from('test_jobs')
    .select('id, url, tier, status, created_at')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }

  return NextResponse.json({ jobs })
}
