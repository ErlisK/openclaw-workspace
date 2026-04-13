import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    // Verify the user is authenticated using the cookie-based client
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name, slug, org_type, annual_budget_usd, city, state, ein,
      funder_types, grant_focus_areas, annual_grant_goal
    } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use service role client to bypass RLS for org creation
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Create organization
    const { data: org, error: orgErr } = await supabaseAdmin
      .from('organizations')
      .insert({
        name,
        slug,
        org_type,
        annual_budget_usd,
        city,
        state,
        ein: ein || null,
        funder_types,
        grant_focus_areas,
        annual_grant_goal,
      })
      .select('id')
      .single()

    if (orgErr) {
      console.error('Org insert error:', orgErr)
      return NextResponse.json({ error: orgErr.message, code: orgErr.code }, { status: 500 })
    }

    // Add user as owner
    const { error: memberErr } = await supabaseAdmin
      .from('organization_members')
      .insert({ organization_id: org.id, user_id: user.id, role: 'owner' })

    if (memberErr && !memberErr.message.includes('duplicate')) {
      console.error('Member insert error:', memberErr)
      return NextResponse.json({ error: memberErr.message }, { status: 500 })
    }

    // Update profile
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update({
        current_organization_id: org.id,
        onboarded_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (profileErr) {
      console.error('Profile update error:', profileErr)
      // Non-fatal, continue
    }

    return NextResponse.json({ organization_id: org.id })
  } catch (err: unknown) {
    console.error('Onboarding error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
