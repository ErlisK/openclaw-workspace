import type { Metadata } from 'next'
import { REPORT_DEMO } from '@/lib/sample-reports/data'
import SampleReportView from '@/components/SampleReportView'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-ouwi0qsjw.vercel.app'

export const metadata: Metadata = {
  title: REPORT_DEMO.seo_title,
  description: REPORT_DEMO.seo_description,
  alternates: { canonical: `${BASE_URL}/report/demo` },
  openGraph: {
    title: REPORT_DEMO.seo_title,
    description: REPORT_DEMO.og_headline,
    url: `${BASE_URL}/report/demo`,
    type: 'website',
    images: [{ url: `${BASE_URL}/og`, width: 1200, height: 630, alt: REPORT_DEMO.seo_title }],
  },
  twitter: {
    card: 'summary_large_image',
    title: REPORT_DEMO.seo_title,
    description: REPORT_DEMO.og_headline,
  },
}

export default function DemoReportPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: REPORT_DEMO.seo_title,
    description: REPORT_DEMO.seo_description,
    url: `${BASE_URL}/report/demo`,
    mainEntity: {
      '@type': 'Report',
      name: REPORT_DEMO.title,
      description: REPORT_DEMO.summary,
      datePublished: REPORT_DEMO.completed_at,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SampleReportView report={REPORT_DEMO} />
    </>
  )
}
