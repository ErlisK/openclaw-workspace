/**
 * GET /api/sandbox/html?url=<target>&session=<sessionId>
 * Validates the URL, fetches HTML, rewrites relative URLs to /api/sandbox/resource,
 * and injects the capture script before </head>.
 *
 * This is served from the same origin but intended to be loaded in a
 * sandboxed iframe (sandbox="allow-scripts allow-forms allow-pointer-lock").
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { validateProxyUrl } from '@/lib/proxy-security'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

const STRIP_REQUEST_HEADERS = new Set([
  'host', 'connection', 'authorization', 'cookie',
  'x-forwarded-for', 'x-real-ip',
])

function rewriteUrls(html: string, targetBase: string, origin: string, sessionId: string): string {
  const base = new URL(targetBase)

  function toAbsolute(href: string): string {
    if (!href || href.startsWith('data:') || href.startsWith('javascript:') || href.startsWith('#')) return href
    try { return new URL(href, base).toString() } catch { return href }
  }

  function toResourceProxy(href: string): string {
    const abs = toAbsolute(href)
    if (!abs || abs.startsWith('data:') || abs.startsWith('javascript:') || abs.startsWith('#')) return abs
    return `${origin}/api/sandbox/resource?u=${encodeURIComponent(abs)}&session=${sessionId}`
  }

  return html
    .replace(/(<(?:a|link|area)\s[^>]*\s*href\s*=\s*)("([^"]*)"|'([^']*)')/gi, (m, pre, _q, dq, sq) =>
      `${pre}"${toResourceProxy(dq ?? sq)}"`)
    .replace(/(<(?:script|img|iframe|embed|source|input|audio|video)\s[^>]*\s*src\s*=\s*)("([^"]*)"|'([^']*)')/gi, (m, pre, _q, dq, sq) =>
      `${pre}"${toResourceProxy(dq ?? sq)}"`)
    .replace(/(<form\s[^>]*\s*action\s*=\s*)("([^"]*)"|'([^']*)')/gi, (m, pre, _q, dq, sq) =>
      `${pre}"${toResourceProxy(dq ?? sq)}"`)
    .replace(/\bsrcset\s*=\s*"([^"]*)"/gi, (_m, srcset) => {
      const rw = srcset.replace(/([^\s,]+)(\s+[^,]*)?/g, (m2: string, src: string, d: string = '') =>
        `${toResourceProxy(src)}${d}`)
      return `srcset="${rw}"`
    })
    .replace(/<base\s[^>]*>/gi, '')
}

function buildCaptureScript(sessionId: string, eventsUrl: string): string {
  return `<script id="agentqa-capture">(function(){
var SID="${sessionId}";
var REPORT="${eventsUrl}";
var buf=[];
var timer=null;
function flush(){
  if(!buf.length)return;
  var batch=buf.splice(0,50);
  fetch(REPORT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events:batch})}).catch(function(){});
}
function schedule(){if(!timer)timer=setTimeout(function(){timer=null;flush();},2000);}
function push(kind,payload){
  var safe=scrub(payload);
  buf.push({kind:kind,ts:Date.now(),payload:safe});
  schedule();
}
function scrub(obj){
  if(!obj)return obj;
  var s=JSON.stringify(obj);
  s=s.replace(/Bearer [A-Za-z0-9._\\-]{8,}/g,'Bearer [REDACTED]');
  s=s.replace(/sk_[A-Za-z0-9]{8,}/g,'sk_[REDACTED]');
  s=s.replace(/pk_[A-Za-z0-9]{8,}/g,'pk_[REDACTED]');
  s=s.replace(/eyJ[A-Za-z0-9._\\-]{20,}/g,'[JWT_REDACTED]');
  s=s.replace(/\\b[0-9]{16}\\b/g,'[PAN_REDACTED]');
  s=s.replace(/[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}/g,'[EMAIL_REDACTED]');
  try{return JSON.parse(s);}catch(e){return {raw:s};}
}
var oFetch=window.fetch;
window.fetch=function(input,init){
  var url=typeof input==='string'?input:(input.url||String(input));
  var method=(init&&init.method)||'GET';
  push('network',{type:'fetch',method:method,url:url});
  return oFetch.apply(this,arguments);
};
var oOpen=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(method,url){
  push('network',{type:'xhr',method:method,url:String(url)});
  return oOpen.apply(this,arguments);
};
['log','warn','error','info'].forEach(function(level){
  var orig=console[level];
  console[level]=function(){
    var args=Array.prototype.slice.call(arguments);
    push('console',{level:level,args:args.map(function(a){try{return JSON.stringify(a);}catch(e){return String(a);}})});
    return orig.apply(console,arguments);
  };
});
document.addEventListener('click',function(e){
  var t=e.target;
  var tag=t?t.tagName:'';
  var text=t?(t.textContent||'').trim().substring(0,100):'';
  var id=t?t.id:'';
  push('click',{tag:tag,text:text,id:id});
},true);
window.addEventListener('beforeunload',function(){flush();});
}());</script>`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const targetUrl = searchParams.get('url')
  const sessionId = searchParams.get('session') ?? ''

  const urlCheck = await validateProxyUrl(targetUrl)
  if (!urlCheck.ok) {
    return new NextResponse(urlCheck.reason, { status: urlCheck.status })
  }

  const supabase = await getSupabaseClient(req)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const forwardHeaders: Record<string, string> = {
    'User-Agent': 'AgentQA-Sandbox/1.0 (testing-platform)',
    Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  }
  for (const [k, v] of req.headers.entries()) {
    if (!STRIP_REQUEST_HEADERS.has(k.toLowerCase())) forwardHeaders[k] = v
  }

  let upstreamRes: Response
  try {
    upstreamRes = await fetch(urlCheck.url.toString(), {
      method: 'GET',
      headers: forwardHeaders,
      redirect: 'follow',
    })
  } catch (err) {
    return new NextResponse(`Failed to fetch: ${String(err)}`, { status: 502 })
  }

  const contentType = upstreamRes.headers.get('content-type') ?? ''

  if (!contentType.includes('text/html')) {
    // Non-HTML: pass through (handled by /resource endpoint usually)
    const body = await upstreamRes.arrayBuffer()
    if (body.byteLength > MAX_SIZE) return new NextResponse('Response too large', { status: 413 })
    return new NextResponse(body, {
      status: upstreamRes.status,
      headers: { 'content-type': contentType, 'cache-control': 'public, max-age=300' },
    })
  }

  const html = await upstreamRes.text()
  if (html.length > MAX_SIZE) return new NextResponse('Response too large', { status: 413 })

  const reqUrl = new URL(req.url)
  const origin = reqUrl.origin
  const eventsUrl = sessionId
    ? `${origin}/api/sessions/${sessionId}/events`
    : `${origin}/api/proxy/sink`

  let rewritten = rewriteUrls(html, urlCheck.url.toString(), origin, sessionId)
  const script = buildCaptureScript(sessionId, eventsUrl)

  if (rewritten.includes('</head>')) {
    rewritten = rewritten.replace('</head>', `${script}</head>`)
  } else if (rewritten.includes('<body')) {
    rewritten = rewritten.replace('<body', `${script}<body`)
  } else {
    rewritten = script + rewritten
  }

  return new NextResponse(rewritten, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      // Permissive CSP for the proxied content to execute
      'content-security-policy': "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors 'self'",
      'x-frame-options': 'SAMEORIGIN',
    },
  })
}
