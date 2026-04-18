import { getVariant } from '@/lib/landing/variants'
import LandingHero from './(landing)/LandingHero'

// Force dynamic to avoid SSR prerender issue with client components using dynamic imports
export const dynamic = 'force-dynamic'

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>
}) {
  const params = await searchParams
  const variant = getVariant(params.v)
  return <LandingHero variant={variant} />
}
