import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Sample Test Report — BetaWindow',
  description: 'See exactly what you get: a real human-tested report with annotated bugs, network logs, console output, and an AI-ready summary you can paste straight into Cursor or Claude.',
}

export default function SampleReportPage() {
  redirect('/report/demo')
}
