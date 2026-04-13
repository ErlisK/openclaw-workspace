import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/cohorts — cohort retention data for internal dashboard
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only alpha users get the cohort dashboard
  const { data: userRow } = await supabase
    .from('users')
    .select('is_alpha')
    .eq('id', user.id)
    .single()

  if (!userRow?.is_alpha) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch cohort metrics
  const { data: cohorts, error } = await supabase
    .from('v_cohort_metrics')
    .select('*')
    .order('signup_week', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Summary stats
  const { data: summary } = await supabase
    .from('v_retention_cohorts')
    .select('*')

  const total = summary?.length || 0
  const activated = summary?.filter(u => u.retained_d7).length || 0
  const published = summary?.filter(u => u.has_published).length || 0
  const savedTemplate = summary?.filter(u => u.saved_template).length || 0

  // Times to first publish (hours)
  const publishedWithTime = summary?.filter(u => u.first_publish_at && u.signup_date)
  const medianHoursToPublish = publishedWithTime && publishedWithTime.length > 0
    ? (() => {
        const hours = publishedWithTime
          .map(u => {
            const signup = new Date(u.signup_date).getTime()
            const pub = new Date(u.first_publish_at).getTime()
            return (pub - signup) / 3600000
          })
          .sort((a, b) => a - b)
        const mid = Math.floor(hours.length / 2)
        return hours[mid] || null
      })()
    : null

  return NextResponse.json({
    summary: {
      total_users: total,
      d7_retention_rate: total > 0 ? Math.round(100 * activated / total) : 0,
      publish_rate: total > 0 ? Math.round(100 * published / total) : 0,
      template_save_rate: total > 0 ? Math.round(100 * savedTemplate / total) : 0,
      median_hours_to_first_publish: medianHoursToPublish,
    },
    cohorts: cohorts || [],
  })
}
