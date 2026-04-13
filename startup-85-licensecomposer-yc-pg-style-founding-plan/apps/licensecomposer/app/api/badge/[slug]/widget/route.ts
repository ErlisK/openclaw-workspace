/**
 * app/api/badge/[slug]/widget/route.ts
 * GET /api/badge/:slug/widget
 *
 * Returns a self-contained JavaScript widget snippet that can be pasted
 * into any storefront page (itch.io, Gumroad, own website).
 *
 * The script injects a styled badge + link without any framework dependency.
 * Supports two modes via `?style=shield|pill|minimal` query param.
 */

export const runtime = 'edge';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pacttailor.com';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const style = searchParams.get('style') ?? 'shield';

  const licenseUrl   = `${APP_URL}/l/${slug}`;
  const badgeImgUrl  = `${APP_URL}/api/badge/${slug}`;
  const widgetId     = `pacttailor-badge-${slug}`;

  // The injected JS is deliberately tiny and self-contained.
  // It creates a single <a> wrapping a <img> badge and an optional text link.
  const script = `/* PactTailor License Badge — pacttailor.com */
(function(){
  var SLUG="${slug}";
  var LICENSE_URL="${licenseUrl}";
  var BADGE_URL="${badgeImgUrl}";
  var WIDGET_ID="${widgetId}";
  var STYLE="${style}";

  // Don't inject twice
  if(document.getElementById(WIDGET_ID)) return;

  function injectBadge(container){
    var wrap=document.createElement("div");
    wrap.id=WIDGET_ID;
    wrap.style.cssText="display:inline-flex;align-items:center;gap:8px;font-family:sans-serif;margin:4px 0;";

    var link=document.createElement("a");
    link.href=LICENSE_URL;
    link.target="_blank";
    link.rel="noopener noreferrer license";
    link.setAttribute("hreflang","en");
    link.title="View verified license on PactTailor";

    if(STYLE==="minimal"){
      // Text-only link
      link.textContent="Licensed via PactTailor \u2192";
      link.style.cssText="color:#4f46e5;font-size:12px;text-decoration:none;border-bottom:1px solid currentColor;";
    } else {
      // Badge image
      var img=document.createElement("img");
      img.src=BADGE_URL;
      img.alt="Verified License \u00b7 PactTailor";
      img.width=188;
      img.height=20;
      img.loading="lazy";
      link.appendChild(img);
    }

    if(STYLE==="pill"){
      // Pill chip below badge
      var chip=document.createElement("span");
      chip.style.cssText="background:#f0f0ff;color:#4f46e5;border:1px solid #c7d2fe;border-radius:99px;font-size:10px;padding:1px 8px;white-space:nowrap;";
      chip.textContent="Verified License";
      wrap.appendChild(link);
      wrap.appendChild(chip);
    } else {
      wrap.appendChild(link);
    }

    container.insertBefore(wrap,container.firstChild);
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",function(){
      injectBadge(document.body);
    });
  } else {
    injectBadge(document.body);
  }
})();`;

  return new Response(script, {
    headers: {
      'Content-Type':                 'application/javascript; charset=utf-8',
      'Cache-Control':                'public, max-age=300, stale-while-revalidate=3600',
      'Access-Control-Allow-Origin':  '*',
      'X-Content-Type-Options':       'nosniff',
    },
  });
}
