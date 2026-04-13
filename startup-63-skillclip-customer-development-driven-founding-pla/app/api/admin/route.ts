import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  // Parallel queries for platform metrics
  const [
    { count: totalClips },
    { count: reviewedClips },
    { count: pendingClips },
    { count: totalReviews },
    { count: completedVerifications },
    { count: totalBadges },
    { count: totalProfiles },
    { count: totalOrgs },
    { data: payments },
    { data: recentReviews },
    { data: planDist },
    { data: tradeDist },
  ] = await Promise.all([
    supabase.from('clips').select('*', { count: 'exact', head: true }),
    supabase.from('clips').select('*', { count: 'exact', head: true }).eq('status', 'reviewed'),
    supabase.from('clips').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('live_verifications').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('badges').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('orgs').select('*', { count: 'exact', head: true }),
    supabase.from('payments').select('amount_cents, payment_type, status, settled_at').eq('status', 'succeeded').order('settled_at'),
    supabase.from('reviews').select('overall_rating').eq('status', 'completed').limit(200),
    supabase.from('orgs').select('plan').limit(50),
    supabase.from('clips').select('trade_id, trades(name, slug)').limit(200) as any,
  ])

  // Revenue calculations
  const totalRevenue = (payments || []).reduce((s: number, p: any) => s + (p.amount_cents || 0), 0)
  const subscriptionRevenue = (payments || []).filter((p: any) => p.payment_type === 'subscription').reduce((s: number, p: any) => s + p.amount_cents, 0)
  const assessmentRevenue = (payments || []).filter((p: any) => p.payment_type !== 'subscription').reduce((s: number, p: any) => s + p.amount_cents, 0)

  // Average review rating
  const ratings = (recentReviews || []).map((r: any) => r.overall_rating).filter(Boolean)
  const avgRating = ratings.length ? (ratings.reduce((s: number, r: number) => s + r, 0) / ratings.length).toFixed(2) : null

  // Plan distribution
  const plans: Record<string, number> = {}
  for (const o of (planDist || [])) {
    plans[o.plan] = (plans[o.plan] || 0) + 1
  }

  return NextResponse.json({
    platform: {
      total_clips: totalClips,
      reviewed_clips: reviewedClips,
      pending_clips: pendingClips,
      upload_success_rate: totalClips ? ((reviewedClips || 0) + (pendingClips || 0)) / totalClips : 1,
      total_reviews: totalReviews,
      completed_verifications: completedVerifications,
      total_badges: totalBadges,
      total_profiles: totalProfiles,
      total_orgs: totalOrgs,
    },
    revenue: {
      total_cents: totalRevenue,
      total_dollars: (totalRevenue / 100).toFixed(2),
      subscription_cents: subscriptionRevenue,
      assessment_cents: assessmentRevenue,
      mrr_cents: subscriptionRevenue,
      mrr_dollars: (subscriptionRevenue / 100).toFixed(2),
    },
    quality: {
      avg_review_rating: avgRating,
      review_sample_size: ratings.length,
    },
    distribution: {
      plans,
    },
    success_criteria: {
      clips_target: 100, clips_actual: totalClips, clips_met: (totalClips || 0) >= 100,
      reviews_target: 30, reviews_actual: totalReviews, reviews_met: (totalReviews || 0) >= 30,
      verifications_target: 5, verifications_actual: completedVerifications, verifications_met: (completedVerifications || 0) >= 5,
    }
  })
}
