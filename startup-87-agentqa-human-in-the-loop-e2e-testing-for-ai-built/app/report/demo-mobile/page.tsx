import type { Metadata } from 'next'
import { REPORT_DEMO_MOBILE } from '@/lib/sample-reports/data'
import SampleReportView from '@/components/SampleReportView'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://startup-87-betawindow-human-in-the-loop-e2e-testing-ouwi0qsjw.vercel.app'

export const metadata: Metadata = {
  title: REPORT_DEMO_MOBILE.seo_title,
  description: REPORT_DEMO_MOBILE.seo_description,
  alternates: { canonical: `${BASE_URL}/report/demo-mobile` },
  openGraph: {
    title: REPORT_DEMO_MOBILE.seo_title,
    description: REPORT_DEMO_MOBILE.og_headline,
    url: `${BASE_URL}/report/demo-mobile`,
    type: 'website',
    images: [{ url: `${BASE_URL}/og`, width: 1200, height: 630, alt: REPORT_DEMO_MOBILE.seo_title }],
  },
  twitter: {
    card: 'summary_large_image',
    title: REPORT_DEMO_MOBILE.seo_title,
    description: REPORT_DEMO_MOBILE.og_headline,
  },
}

export default function DemoMobileReportPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: REPORT_DEMO_MOBILE.seo_title,
    description: REPORT_DEMO_MOBILE.seo_description,
    url: `${BASE_URL}/report/demo-mobile`,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SampleReportView report={REPORT_DEMO_MOBILE} />
    </>
  )
}
