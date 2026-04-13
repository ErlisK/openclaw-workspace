import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://playtestflow.vercel.app'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PlaytestFlow Widget</title>
  <style>body { margin: 0; padding: 16px; background: transparent; }</style>
</head>
<body>
  <div id="ptf-widget-${sessionId}"></div>
  <script data-ptf-session="${sessionId}" src="${origin}/api/widget/${sessionId}" async></script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'X-Frame-Options': 'ALLOWALL',
    },
  })
}
