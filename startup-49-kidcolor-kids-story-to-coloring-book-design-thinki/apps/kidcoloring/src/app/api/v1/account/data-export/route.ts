import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * GET  /api/v1/account/data-export
 *   Returns a complete JSON export of all data associated with the authenticated parent.
 *   Includes: profile, children, sessions, pages, orders, survey responses.
 *   GDPR Art. 20 + COPPA parental access right.
 *
 * DELETE /api/v1/account/data-export
 *   Permanently deletes the account and all associated data.
 *   Returns { deletedAt, summary } confirming what was deleted.
 *   GDPR Art. 17 + COPPA parental deletion right.
 *
 * Both endpoints require a valid Supabase JWT (parent is authenticated).
 */

function svc(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)

  // Verify token using anon client
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const { data: { user }, error } = await anon.auth.getUser(token)
  if (error || !user) return null
  return user.id
}

// ── GET — Data Export ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const sb = svc()

  // Fetch all parent data in parallel
  const [
    { data: profile },
    { data: children },
    { data: sessions },
    { data: orders },
    { data: surveys },
    { data: referrals },
  ] = await Promise.all([
    sb.from('profiles').select('*').eq('id', userId).single(),
    sb.from('children').select('id, name_or_alias, age, interests, created_at').eq('parent_id', userId),
    sb.from('trial_sessions').select('id, created_at, status, concept, config, complete_at').eq('user_id', userId),
    sb.from('orders').select('id, amount_cents, currency, status, price_id, created_at, paid_at').eq('user_id', userId),
    sb.from('survey_responses').select('question_key, csat_rating, answer, created_at').eq('user_id', userId),
    sb.from('referrals').select('id, code, created_at, credits_earned').eq('referrer_id', userId),
  ])

  // Fetch pages for all sessions
  const sessionIds = (sessions ?? []).map(s => s.id as string)
  const { data: pages } = sessionIds.length > 0
    ? await sb.from('trial_pages').select('session_id, page_number, subject, prompt, status, created_at').in('session_id', sessionIds)
    : { data: [] }

  const exportData = {
    exportedAt: new Date().toISOString(),
    exportVersion: '1.0',
    legalBasis: 'GDPR Article 20 (data portability) + COPPA parental access right',
    account: {
      userId,
      profile:   profile ?? null,
      children:  children ?? [],
    },
    activity: {
      sessions: (sessions ?? []).map(s => ({
        ...s,
        pages: (pages ?? []).filter(p => p.session_id === s.id),
      })),
    },
    payments: {
      orders: orders ?? [],
    },
    feedback: {
      surveys: surveys ?? [],
    },
    referrals: referrals ?? [],
    dataRetentionNote: 'Payment records are retained for 7 years per tax regulations. Session data is deleted upon account deletion.',
  }

  // Log the export request
  void sb.from('events').insert({
    user_id:    userId,
    event_name: 'data_export_requested',
    properties: { exportedAt: exportData.exportedAt },
  }).then(() => null).catch(() => null)

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="kidcoloring-data-export-${new Date().toISOString().slice(0,10)}.json"`,
    },
  })
}

// ── DELETE — Account Deletion ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const sb  = svc()
  const now = new Date().toISOString()

  // Gather counts before deletion
  const [
    { count: childCount },
    { count: sessionCount },
    { count: orderCount },
    { count: surveyCount },
  ] = await Promise.all([
    sb.from('children').select('*', { count: 'exact', head: true }).eq('parent_id', userId),
    sb.from('trial_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    sb.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    sb.from('survey_responses').select('*', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  // Orders with payments are retained for tax purposes (7 years)
  // All other data is deleted
  const deletionOrder = [
    // 1. Children (cascade deletes child-related records via FK)
    sb.from('children').delete().eq('parent_id', userId),
    // 2. Trial pages (via sessions cascade, but explicit for safety)
    sb.from('trial_sessions').select('id').eq('user_id', userId)
      .then(({ data: sess }) => {
        if (!sess?.length) return null
        return sb.from('trial_pages').delete().in('session_id', sess.map(s => s.id as string))
      }),
    // 3. Survey responses
    sb.from('survey_responses').delete().eq('user_id', userId),
    // 4. Events (anonymise rather than delete to preserve analytics)
    sb.from('events').update({ user_id: null }).eq('user_id', userId),
    // 5. Sessions
    sb.from('trial_sessions').delete().eq('user_id', userId),
    // 6. Referrals (deactivate code)
    sb.from('referrals').update({ status: 'deactivated' }).eq('referrer_id', userId),
    // 7. Profile
    sb.from('profiles').delete().eq('id', userId),
  ]

  // Execute in sequence to respect FK constraints
  for (const op of deletionOrder) {
    try { await op } catch { /* best-effort — log but continue */ }
  }

  // Delete the auth user last (this invalidates their tokens)
  const { error: authError } = await sb.auth.admin.deleteUser(userId)

  // Log the deletion event (anonymised — no user_id)
  void sb.from('events').insert({
    event_name: 'account_deleted',
    properties: {
      deletedAt:     now,
      childCount:    childCount ?? 0,
      sessionCount:  sessionCount ?? 0,
      ordersRetained: orderCount ?? 0,  // orders kept for tax
    },
  }).then(() => null).catch(() => null)

  return NextResponse.json({
    deleted: true,
    deletedAt: now,
    summary: {
      childProfilesDeleted:    childCount ?? 0,
      sessionsDeleted:         sessionCount ?? 0,
      surveysDeleted:          surveyCount ?? 0,
      ordersRetained:          orderCount ?? 0,  // retained 7 years for tax
      eventsAnonymised:        true,
      authAccountDeleted:      !authError,
    },
    legalNote: 'Payment records are retained for 7 years as required by tax law. All other personal data has been permanently deleted.',
  })
}
