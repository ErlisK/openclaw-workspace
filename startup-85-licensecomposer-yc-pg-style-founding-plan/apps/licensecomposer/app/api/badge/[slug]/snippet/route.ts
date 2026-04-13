/**
 * app/api/badge/[slug]/snippet/route.ts
 * GET /api/badge/:slug/snippet
 *
 * Returns JSON with all embeddable code snippets for a license page badge:
 * - html      : static <a><img> link (works everywhere)
 * - script    : <script src=...> self-injecting widget
 * - markdown  : [![badge](url)](licenseUrl)
 * - bbcode    : [url=...][img]...[/img][/url]  (forums, itch.io)
 * - rst       : reStructuredText .. image::
 * - plain     : Plain text URL for descriptions
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pacttailor.com';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const licenseUrl  = `${APP_URL}/l/${slug}`;
  const badgeUrl    = `${APP_URL}/api/badge/${slug}`;
  const widgetUrl   = `${APP_URL}/api/badge/${slug}/widget`;
  const widgetUrlPill = `${APP_URL}/api/badge/${slug}/widget?style=pill`;
  const widgetUrlMinimal = `${APP_URL}/api/badge/${slug}/widget?style=minimal`;

  const snippets = {
    license_url: licenseUrl,
    badge_url:   badgeUrl,
    widget_url:  widgetUrl,

    html: `<a href="${licenseUrl}" target="_blank" rel="noopener noreferrer license" hreflang="en">\n  <img src="${badgeUrl}" alt="Verified License · PactTailor" width="188" height="20"/>\n</a>`,

    script_shield: `<script src="${widgetUrl}" async></script>`,
    script_pill:   `<script src="${widgetUrlPill}" async></script>`,
    script_minimal:`<script src="${widgetUrlMinimal}" async></script>`,

    markdown: `[![Verified License · PactTailor](${badgeUrl})](${licenseUrl})`,

    bbcode: `[url=${licenseUrl}][img]${badgeUrl}[/img][/url]`,

    rst: `.. image:: ${badgeUrl}\n   :target: ${licenseUrl}\n   :alt: Verified License · PactTailor`,

    plain: `Licensed via PactTailor: ${licenseUrl}`,

    // Complete HTML snippet with JSON-LD microdata for SEO-savvy publishers
    html_full: `<!-- PactTailor Verified License Badge -->
<div itemscope itemtype="https://schema.org/DigitalDocument">
  <a href="${licenseUrl}" target="_blank" rel="noopener noreferrer license" hreflang="en"
     itemprop="url" aria-label="View verified license on PactTailor">
    <img src="${badgeUrl}" alt="Verified License · PactTailor" width="188" height="20"
         loading="lazy" itemprop="image"/>
  </a>
  <meta itemprop="name" content="Verified License"/>
  <meta itemprop="publisher" content="PactTailor"/>
</div>
<!-- End PactTailor Badge -->`,
  };

  return Response.json(snippets, {
    headers: {
      'Cache-Control':               'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
