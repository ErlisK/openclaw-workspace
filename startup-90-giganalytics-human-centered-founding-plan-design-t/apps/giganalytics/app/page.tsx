import { getVariant } from '@/lib/landing/variants'
import LandingHero from './(landing)/LandingHero'

// Force dynamic to avoid SSR prerender issue with client components using dynamic imports
export const dynamic = 'force-dynamic'

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "GigAnalytics",
  "url": "https://hourlyroi.com",
  "description": "Analytics dashboard for freelancers and solopreneurs managing 2–5 income streams. Calculates true hourly rate, acquisition ROI, and pricing recommendations.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "Free plan available"
  },
  "creator": {
    "@type": "Organization",
    "name": "GigAnalytics",
    "url": "https://hourlyroi.com"
  }
}

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>
}) {
  const params = await searchParams
  const variant = getVariant(params.v)
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingHero variant={variant} />
    </>
  )
}
