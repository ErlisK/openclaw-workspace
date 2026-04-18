import { NextResponse } from 'next/server'
import { CHANGELOG_ENTRIES } from '@/lib/changelog'
import { SAFE_APP_URL } from '@/lib/url'

export const revalidate = 3600 // Cache for 1 hour

export async function GET() {
  const baseUrl = SAFE_APP_URL

  const items = CHANGELOG_ENTRIES.map(entry => {
    const bulletList = entry.items.map(i => `<li>${i}</li>`).join('')
    return `
    <item>
      <title><![CDATA[v${entry.version} — ${entry.title}]]></title>
      <link>${baseUrl}/changelog</link>
      <guid isPermaLink="false">${baseUrl}/changelog#v${entry.version}</guid>
      <pubDate>${new Date(entry.date).toUTCString()}</pubDate>
      <description><![CDATA[
        <h2>v${entry.version} — ${entry.title}</h2>
        <ul>${bulletList}</ul>
      ]]></description>
      <category>${entry.tag}</category>
    </item>`
  }).join('\n')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>GigAnalytics Changelog</title>
    <link>${baseUrl}/changelog</link>
    <description>New features, fixes, and improvements to GigAnalytics — the ROI dashboard for multi-income freelancers.</description>
    <language>en-us</language>
    <managingEditor>hello@giganalytics.app (GigAnalytics)</managingEditor>
    <webMaster>hello@giganalytics.app (GigAnalytics)</webMaster>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/api/rss" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/og-image.png</url>
      <title>GigAnalytics</title>
      <link>${baseUrl}</link>
    </image>
${items}
  </channel>
</rss>`

  return new NextResponse(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
