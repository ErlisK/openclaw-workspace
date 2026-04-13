'use client'
/**
 * SocialProofBadgeIsland — SSR-safe wrapper around SocialProofBadge.
 * This is a client component so it can use dynamic() with ssr:false,
 * which is NOT allowed in Server Components.
 */
import dynamic from 'next/dynamic'

const SocialProofBadge = dynamic(() => import('./SocialProofBadge'), { ssr: false })

export default function SocialProofBadgeIsland() {
  return <SocialProofBadge />
}
