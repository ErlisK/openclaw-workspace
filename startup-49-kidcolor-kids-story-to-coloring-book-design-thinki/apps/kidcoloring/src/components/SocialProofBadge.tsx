'use client'
/**
 * SocialProofBadge — cycle 4 social_proof_v1 experiment
 *
 * Variant A (control): renders nothing
 * Variant B: shows "Join 2,847+ families" badge
 *
 * Assignment is hash-based using a localStorage session token.
 * Falls back to variant A if no token yet.
 */
import { useEffect, useState } from 'react'
import { hashBucket, pickVariant } from '@/lib/experiments'

const EXP_KEY   = 'social_proof_v1'
const VARIANTS  = [
  { id: 'A', name: 'No badge',    weight: 50 },
  { id: 'B', name: 'Count badge', weight: 50 },
]
const COUNT = 2847   // families count shown in variant B

export default function SocialProofBadge() {
  const [variant, setVariant] = useState<'A' | 'B' | null>(null)
  const [count,   setCount]   = useState(COUNT)

  useEffect(() => {
    // Get or create a lightweight visitor token (not full session — just for landing A/B)
    let token = localStorage.getItem('kc_visitor_token')
    if (!token) {
      token = Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem('kc_visitor_token', token)
    }
    const bucket = hashBucket(token, EXP_KEY)
    const vid = pickVariant(bucket, VARIANTS) as 'A' | 'B'
    setVariant(vid)

    // Log view event (fire-and-forget)
    fetch('/api/v1/event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'page_view',
        props: { page: 'landing', experiment: EXP_KEY, variant: vid },
      }),
    }).catch(() => {})

    // Optionally fetch live session count for freshness
    fetch('/api/v1/session-count').then(r => r.json()).then((d: { count?: number }) => {
      if (d.count && d.count > COUNT) setCount(d.count)
    }).catch(() => {})
  }, [])

  if (!variant || variant === 'A') return null

  return (
    <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 
                    text-green-700 text-sm font-semibold px-4 py-2 rounded-full mb-4">
      <span className="text-base">👨‍👩‍👧‍👦</span>
      <span>Join {count.toLocaleString()}+ families making personalized books</span>
      <span className="flex gap-0.5">
        {'⭐'.repeat(5).split('').map((s, i) => <span key={i}>{s}</span>)}
      </span>
    </div>
  )
}
