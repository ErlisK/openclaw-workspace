import { getVariant } from '@/lib/landing/variants'
import LandingHero from './LandingHero'

// Server component: reads ?v= param, passes variant to client hero
export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>
}) {
  const params = await searchParams
  const variant = getVariant(params.v)
  return <LandingHero variant={variant} />
}
