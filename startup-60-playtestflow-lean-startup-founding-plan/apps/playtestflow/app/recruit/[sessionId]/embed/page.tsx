import { createServiceClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface EmbedPageProps {
  params: Promise<{ sessionId: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function EmbedPage({ params, searchParams }: EmbedPageProps) {
  const { sessionId } = await params
  const sp = await searchParams

  const theme      = (sp.theme ?? 'dark') as 'dark' | 'light' | 'auto'
  const accentHex  = sp.accent ? `#${sp.accent.replace('#','')}` : '#ff6600'
  const hideHeader = sp.hideHeader === '1'
  const hideFooter = sp.hideFooter === '1'
  const compact    = sp.compact === '1'
  const btnText    = sp.btn ? decodeURIComponent(sp.btn) : 'Sign Up as a Tester →'
  const refCode    = sp.ref ?? null

  const svc = createServiceClient()
  const { data: session } = await svc
    .from('playtest_sessions')
    .select('id, title, platform, duration_minutes, max_testers, scheduled_at, status, projects(name, description)')
    .eq('id', sessionId)
    .in('status', ['recruiting', 'scheduled'])
    .single()

  if (!session) notFound()

  const { count: signupCount } = await svc
    .from('session_signups')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .in('status', ['registered', 'confirmed'])

  const spotsLeft = Math.max(0, (session.max_testers ?? 6) - (signupCount ?? 0))
  const isFull = spotsLeft === 0

  // Theme tokens
  const isDark = theme === 'dark' || theme === 'auto' // SSR default
  const bg      = isDark ? '#0d1117' : '#ffffff'
  const surface = isDark ? 'rgba(255,255,255,0.05)' : '#f6f8fa'
  const border  = isDark ? 'rgba(255,255,255,0.1)'  : '#d0d7de'
  const text    = isDark ? '#f0f6fc' : '#1f2328'
  const muted   = isDark ? '#8b949e' : '#57606a'

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://playtestflow.vercel.app'
  let signupUrl = `${APP_URL}/recruit/${sessionId}`
  if (refCode) signupUrl += `?ref=${encodeURIComponent(refCode)}`

  const project = Array.isArray(session.projects) ? session.projects[0] : session.projects
  const desc = project && 'description' in project ? (project as { description?: string }).description : null

  const pad = compact ? '12px 14px' : '18px 20px'

  return (
    <html lang="en" style={{ margin: 0, padding: 0 }}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <title>{session.title} — Playtester Signup</title>
        <style>{`
          *{box-sizing:border-box;margin:0;padding:0}
          html,body{background:${bg};color:${text};font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;line-height:1.5}
          body{padding:${pad}}
          .hdr{display:${hideHeader?'none':'flex'};align-items:center;gap:8px;margin-bottom:${compact?'10px':'14px'}}
          .logo{font-weight:800;font-size:12px;letter-spacing:-.3px;color:${accentHex}}
          .badge{background:${accentHex}22;color:${accentHex};border:1px solid ${accentHex}44;border-radius:100px;padding:2px 8px;font-size:11px;font-weight:600}
          .badge.full{background:rgba(239,68,68,.1);color:#f87171;border-color:rgba(239,68,68,.3)}
          .title{font-size:${compact?'15px':'17px'};font-weight:700;margin-bottom:4px;line-height:1.3}
          .desc{font-size:12px;color:${muted};margin-bottom:12px;display:${compact?'none':'block'};-webkit-line-clamp:2;overflow:hidden;display:${compact?'none':'-webkit-box'};-webkit-box-orient:vertical}
          .meta{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:${compact?'10px':'14px'}}
          .chip{background:${surface};border:1px solid ${border};border-radius:8px;padding:3px 9px;font-size:11px;color:${muted}}
          .chip strong{color:${text}}
          .cta{display:block;width:100%;background:${accentHex};color:#fff;border:none;border-radius:10px;padding:${compact?'9px':'12px'} 18px;font-size:${compact?'13px':'14px'};font-weight:700;text-align:center;text-decoration:none;cursor:pointer;letter-spacing:.2px}
          .cta:hover{opacity:.9}
          .cta.full{background:${surface};color:${muted};border:1px solid ${border};cursor:default;pointer-events:none}
          .footer{margin-top:10px;text-align:center;font-size:10px;color:${muted};display:${hideFooter?'none':'block'}}
          .footer a{color:${accentHex};text-decoration:none}
        `}</style>
      </head>
      <body>
        {!hideHeader && (
          <div className="hdr">
            <span className="logo">PlaytestFlow</span>
            <span className={`badge${isFull?' full':''}`}>
              {isFull ? 'Session Full' : `${spotsLeft} spot${spotsLeft!==1?'s':''} left`}
            </span>
          </div>
        )}

        <div className="title">{session.title}</div>

        {desc && !compact && <div className="desc">{desc}</div>}

        <div className="meta">
          {session.platform    && <span className="chip">🎲 <strong>{session.platform}</strong></span>}
          {session.duration_minutes && <span className="chip">⏱ <strong>{session.duration_minutes} min</strong></span>}
          {session.max_testers && <span className="chip">👥 <strong>{spotsLeft}/{session.max_testers}</strong></span>}
          {session.scheduled_at && (
            <span className="chip">📅 <strong>{new Date(session.scheduled_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</strong></span>
          )}
        </div>

        {isFull
          ? <span className="cta full">Session Full</span>
          : <a href={signupUrl} target="_blank" rel="noopener noreferrer" className="cta"
              id="ptf-cta">{btnText}</a>
        }

        {!hideFooter && (
          <div className="footer">
            Powered by <a href={`${APP_URL}/docs/embed`} target="_blank" rel="noopener noreferrer">PlaytestFlow</a>
          </div>
        )}

        {/* postMessage bridge */}
        <script dangerouslySetInnerHTML={{ __html: `
(function(){
  function send(type,extra){window.parent.postMessage(Object.assign({type:type,session:'${sessionId}'},extra||{}),'*')}
  function resize(){send('ptf:resize',{height:document.body.scrollHeight})}
  send('ptf:ready');resize();
  window.addEventListener('resize',resize);
  var cta=document.getElementById('ptf-cta');
  if(cta)cta.addEventListener('click',function(){send('ptf:click')});
})();
        `}} />
      </body>
    </html>
  )
}
