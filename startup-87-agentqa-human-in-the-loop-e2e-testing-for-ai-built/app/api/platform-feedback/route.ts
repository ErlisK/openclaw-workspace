import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// POST /api/platform-feedback — submit in-app feedback
// Unauthenticated users can submit (user_id will be null)
// Authenticated users get their user_id attached
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { rating, comment, category = 'general', page, url, metadata } = body

    // Validate
    if (rating != null && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'rating must be 1–5' }, { status: 400 })
    }
    if (!comment && !rating) {
      return NextResponse.json({ error: 'comment or rating required' }, { status: 400 })
    }
    const validCategories = ['bug', 'feature', 'general', 'praise']
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: `category must be one of ${validCategories.join(', ')}` }, { status: 400 })
    }

    // Resolve user_id from auth token if present
    let userId: string | null = null
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const anonClient = createClient(SUPABASE_URL, ANON_KEY)
      const { data: { user } } = await anonClient.auth.getUser(token)
      userId = user?.id ?? null
    }

    // Insert using service role (bypasses RLS restrictions for anon inserts)
    const admin = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data, error } = await admin
      .from('platform_feedback')
      .insert({
        user_id: userId,
        rating: rating ?? null,
        comment: comment ?? null,
        category,
        page: page ?? null,
        url: url ?? null,
        metadata: metadata ?? null,
      })
      .select('id, created_at')
      .single()

    if (error) {
      console.error('platform_feedback insert error', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ feedback: data }, { status: 201 })
  } catch (err) {
    console.error('platform-feedback POST error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/platform-feedback — admin list (service role required)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.slice(7)

  // Only service role token or admin users can list
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)
  const anonClient = createClient(SUPABASE_URL, ANON_KEY)
  const { data: { user } } = await anonClient.auth.getUser(token)

  const isServiceRole = token === SERVICE_KEY
  const isAdmin = user
    ? (await admin.from('users').select('role').eq('id', user.id).single()).data?.role === 'admin'
    : false

  if (!isServiceRole && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
  const offset = parseInt(searchParams.get('offset') ?? '0')
  const category = searchParams.get('category')

  let query = admin
    .from('platform_feedback')
    .select('id, user_id, rating, comment, category, page, url, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category) query = query.eq('category', category)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ feedback: data, total: count })
}
