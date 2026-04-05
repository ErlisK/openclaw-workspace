(()=>{var e={};e.id=4281,e.ids=[4281],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},56621:(e,t,r)=>{"use strict";r.d(t,{E2:()=>s,_8:()=>i});var a=r(73026);let o="https://lpxhxmpzqjygsaawkrva.supabase.co",n=process.env.SUPABASE_SERVICE_ROLE_KEY;function i(){return(0,a.UU)(o,n,{auth:{persistSession:!1}})}(0,a.UU)(o,"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxweGh4bXB6cWp5Z3NhYXdrcnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDA4NjMsImV4cCI6MjA5MDcxNjg2M30.MZhuBLuFx6tEyCgNYepmaD2HtkngjetiuKeBBnCA1UA");let s=i()},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},71484:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>k,routeModule:()=>f,serverHooks:()=>x,workAsyncStorage:()=>w,workUnitAsyncStorage:()=>v});var a={};r.r(a),r.d(a,{GET:()=>m,POST:()=>m,dynamic:()=>y});var o=r(96559),n=r(48088),i=r(37719),s=r(32190),c=r(56621);let l=process.env.NEXT_PUBLIC_APP_URL??"https://change-risk-radar.vercel.app";function d(e,t=""){return`${l}/dashboard/${e.org_slug}${t}?token=${e.magic_token}`}function u(e){return`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Change Risk Radar</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">${e.preheader}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
<tr><td>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#1e293b;border-radius:12px;border:1px solid #334155;overflow:hidden;">
  <!-- Header -->
  <tr><td style="padding:24px 32px 20px;border-bottom:1px solid #334155;">
    <span style="font-size:18px;font-weight:900;color:#e2e8f0;">📡 Change Risk Radar</span>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:32px;">
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#f1f5f9;line-height:1.3;">${e.headline}</h1>
    <div style="color:#cbd5e1;font-size:15px;line-height:1.7;">${e.body}</div>
    <div style="margin:28px 0;">
      <a href="${e.cta_url}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:15px;">${e.cta_text}</a>
    </div>
    ${e.footer_note?`<p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">${e.footer_note}</p>`:""}
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:16px 32px;border-top:1px solid #334155;">
    <p style="margin:0;font-size:12px;color:#475569;">
      Change Risk Radar \xb7 <a href="${l}" style="color:#6366f1;text-decoration:none;">change-risk-radar.vercel.app</a><br>
      Questions? Reply to this email or contact <a href="mailto:support@change-risk-radar.com" style="color:#6366f1;">support@change-risk-radar.com</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`}async function p(e,t,r){let{data:a}=await c.E2.from("crr_nudge_log").select("id").eq("org_id",e).eq("nudge_type",t).single();if(a)return{ok:!0};let{subject:o,text:n}=function(e,t){let r=d(t),a=d(t,"/connect"),o=d(t,"/billing"),n=`${l}/pricing`;switch(e){case"day0_welcome":return{subject:`Welcome to Change Risk Radar — here's how to get your first alert in 5 minutes`,text:`Hi there,

Thanks for signing up for Change Risk Radar. Your 14-day free trial starts now.

Here's how to get your first risk alert in under 5 minutes:

1. Add your first connector (Stripe, AWS, or Google Workspace):
   ${a}

2. We'll monitor it in real-time and send you an alert the moment something changes.

3. Each alert includes:
   - What changed and why it matters
   - Specific action steps for your team
   - Risk level (Critical / High / Medium / Low)

Your dashboard: ${r}

Questions? Just reply to this email.

— Erlis
Change Risk Radar`,html:u({preheader:"Your 14-day trial starts now — first alert in 5 minutes",headline:`Welcome to Change Risk Radar 📡`,body:`<p>Your 14-day free trial just started. Here's how to get your first risk alert in under 5 minutes:</p>
<ol style="color:#e2e8f0;line-height:2;font-size:15px;">
  <li><strong>Connect your first integration</strong> — Stripe, AWS, or Google Workspace</li>
  <li>We monitor it in real-time (p95 latency ≤5 minutes)</li>
  <li>You get an alert with plain-English impact + action steps</li>
</ol>`,cta_text:"Connect your first integration →",cta_url:a,footer_note:"You have <strong>14 days</strong> remaining in your free trial. No credit card required to start."})};case"day1_connect":return{subject:`You haven't connected anything yet — takes 2 minutes`,text:`Hi,

You signed up for Change Risk Radar yesterday but haven't connected an integration yet.

It takes 2 minutes:
- Stripe: paste a read-only API key
- AWS: create a cross-account IAM role (we give you the exact policy)
- Google Workspace: OAuth in 3 clicks

Once connected, we'll detect changes within 5 minutes.

Connect now: ${a}

If you're stuck on setup, just reply to this email.

— Erlis`,html:u({preheader:"Connect your first integration in 2 minutes",headline:"You're one step away from your first alert",body:`<p>You signed up yesterday but haven't connected an integration yet. Takes 2 minutes — choose one to start:</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0;">
  ${["\uD83D\uDCB3 Stripe — paste a read-only API key","☁️ AWS CloudTrail — cross-account IAM role","\uD83D\uDD35 Google Workspace — OAuth in 3 clicks","\uD83D\uDECD️ Shopify — Admin API token","☁️ Salesforce — Connected App OAuth"].map(e=>`<tr><td style="padding:8px 0;color:#e2e8f0;font-size:14px;">✓ ${e}</td></tr>`).join("")}
</table>`,cta_text:"Connect now →",cta_url:a,footer_note:"13 days remaining in your free trial."})};case"day3_progress":{let e=t.alert_count>0;return{subject:e?`You've caught ${t.alert_count} vendor change${1!==t.alert_count?"s":""} so far`:"Here's what you're missing without active monitoring",text:e?`Hi,

You're 3 days into your trial and Change Risk Radar has already detected ${t.alert_count} change${1!==t.alert_count?"s":""} across your vendor stack.

View your alerts: ${r}

Each alert includes the specific impact to your business and the exact action to take.

— Erlis`:`Hi,

You're 3 days into your trial but haven't connected an integration yet. While you're reading this, Stripe, AWS, and Workspace are making changes that could affect your billing, API integrations, or security posture — silently.

Connect your first integration: ${a}

— Erlis`,html:u({preheader:e?`${t.alert_count} changes caught so far`:"You're missing real-time vendor intelligence",headline:e?`${t.alert_count} change${1!==t.alert_count?"s":""} caught so far 🎯`:"Here's what you're missing",body:e?`<p>You're 3 days into your trial. Change Risk Radar has detected <strong>${t.alert_count} vendor change${1!==t.alert_count?"s":""}</strong> that could affect ${t.org_name}.</p>
<p style="color:#94a3b8;">Each alert includes: what changed, why it matters for your business, and the exact action to take. No noise — just signal.</p>`:`<p>You're 3 days into your trial but haven't connected an integration yet.</p>
<p>While you're reading this, vendors are making changes that affect your billing, security, and API integrations — silently. The average company discovers critical vendor changes <strong>days or weeks late</strong>.</p>`,cta_text:e?"View your alerts →":"Connect now — takes 2 min →",cta_url:e?r:a,footer_note:`${14-t.trial_day} days remaining in your trial.`})}}case"day7_halfway":return{subject:`Halfway through your trial — here's your risk summary`,text:`Hi,

You're halfway through your 14-day trial. Here's where things stand for ${t.org_name}:

- Connectors active: ${t.connector_count}
- Changes detected: ${t.alert_count}
- Alerts acted on: ${t.reaction_count}
- Activation score: ${t.activation_score}/100

${t.alert_count>0?`You've already caught ${t.alert_count} changes your team would otherwise have missed.`:"You haven't connected an integration yet — you have 7 days left."}

View your dashboard: ${r}
Upgrade to keep monitoring: ${o}

— Erlis`,html:u({preheader:"7 days in — here's your risk summary",headline:"You're halfway through your trial",body:`<p>Here's where things stand for <strong>${t.org_name}</strong> after 7 days:</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0;">
  ${[["Connectors active",t.connector_count.toString()],["Vendor changes detected",t.alert_count.toString()],["Alerts acted on",t.reaction_count.toString()],["Activation score",`${t.activation_score}/100`]].map(([e,t])=>`<tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">${e}</td><td style="padding:8px 0;color:#e2e8f0;font-weight:700;font-size:14px;text-align:right;">${t}</td></tr>`).join("")}
</table>
${t.alert_count>0?`<p style="color:#10b981;">You've already caught ${t.alert_count} vendor change${1!==t.alert_count?"s":""} your team would otherwise have missed.</p>`:`<p style="color:#f59e0b;">You haven't connected an integration yet — you have 7 days left to try it.</p>`}`,cta_text:"View dashboard →",cta_url:r,footer_note:`<strong>7 days remaining</strong> in your trial. <a href="${o}" style="color:#6366f1;">Upgrade before it expires</a>.`})};case"day10_nudge":return{subject:`3 days left and you haven't fully activated — can I help?`,text:`Hi,

Your trial ends in 4 days and your activation score is ${t.activation_score}/100.

If you're stuck on setup or evaluating whether this fits your stack, I'm happy to do a 15-min async walkthrough via Loom.

Just reply to this email and tell me:
1. Which vendors you're most worried about (Stripe, AWS, Workspace, Shopify, Salesforce)
2. What kind of changes keep you up at night (pricing, API deprecations, security, compliance)

I'll send you a custom setup guide for your stack.

Or just connect now: ${a}

— Erlis`,html:u({preheader:"4 days left — can I help you get set up?",headline:"Can I help you get set up?",body:`<p>Your trial ends in 4 days and your activation score is <strong>${t.activation_score}/100</strong>.</p>
<p>If you're evaluating whether this fits your stack, just reply to this email with:</p>
<ol style="color:#e2e8f0;line-height:2;">
  <li>Which vendors you're most worried about</li>
  <li>What kind of changes you need to catch (pricing, API, security, compliance)</li>
</ol>
<p>I'll send you a custom setup guide within a few hours.</p>`,cta_text:"Or connect now →",cta_url:a,footer_note:"4 days remaining in your trial."})};case"day11_expiry":return{subject:`⏰ 3 days left — lock in your rate before trial ends`,text:`Hi,

Your trial ends in 3 days. Here's what happens when it expires:
- Your connector checks pause
- New alerts stop coming in
- Your alert history is kept for 30 days
- You can reactivate anytime

Lock in your rate now:
- Starter: $500/month (2 connectors, 500 alerts/mo) → ${o}
- Growth: $1,500/month (5 connectors, 2,000 alerts/mo) → ${o}
- Quarterly billing saves 10% — annual saves 20%

Don't want to upgrade yet? Just let the trial expire and come back anytime.

— Erlis`,html:u({preheader:"3 days left — lock in your monitoring rate",headline:"⏰ 3 days left in your trial",body:`<p>Your trial ends in <strong>3 days</strong>. After expiry, connector checks pause — but you can reactivate anytime.</p>
<p><strong>Lock in your rate:</strong></p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:10px;background:rgba(99,102,241,0.1);border-radius:8px;color:#e2e8f0;">
    <strong style="color:#a5b4fc;">Starter</strong> — $500/mo<br/>
    <span style="font-size:13px;color:#94a3b8;">2 connectors \xb7 500 alerts/mo</span>
  </td></tr>
  <tr><td style="padding:4px;"></td></tr>
  <tr><td style="padding:10px;background:rgba(99,102,241,0.15);border-radius:8px;color:#e2e8f0;border:1px solid rgba(99,102,241,0.3);">
    <strong style="color:#a5b4fc;">Growth</strong> — $1,500/mo <span style="font-size:12px;color:#10b981;">(most popular)</span><br/>
    <span style="font-size:13px;color:#94a3b8;">5 connectors \xb7 2,000 alerts/mo</span>
  </td></tr>
</table>
<p style="color:#10b981;font-size:13px;">Quarterly billing = 10% off \xb7 Annual = 20% off</p>`,cta_text:"Upgrade now →",cta_url:o,footer_note:"No action needed if you don't want to upgrade — your data is kept for 30 days."})};case"day14_last":return{subject:"Your Change Risk Radar trial ends today",text:`Hi,

Your 14-day free trial ends today.

If you want to keep monitoring your vendor stack, upgrade now:
${o}

What you'll lose access to today if you don't upgrade:
- Real-time connector checks
- New alert detection
- Weekly risk briefs

Your data (${t.alert_count} alerts, connector history) is kept for 30 days. You can reactivate anytime.

If this wasn't the right time, I'd appreciate 30 seconds of feedback: what would have made you upgrade? Just reply.

— Erlis`,html:u({preheader:"Your trial ends today — upgrade or your data is kept 30 days",headline:"Your trial ends today",body:`<p>Your 14-day free trial ends today. After today:</p>
<ul style="color:#e2e8f0;line-height:2;">
  <li>Real-time connector checks pause</li>
  <li>New alert detection stops</li>
  <li>Your <strong>${t.alert_count} alerts</strong> are kept for 30 days</li>
  <li>You can reactivate anytime</li>
</ul>
<p style="color:#94a3b8;font-size:13px;">If this wasn't the right time, I'd appreciate a quick reply about what would have made you upgrade.</p>`,cta_text:"Upgrade and keep monitoring →",cta_url:o,footer_note:`<a href="${n}" style="color:#6366f1;">View pricing</a> \xb7 Starter $500/mo \xb7 Growth $1,500/mo`})}}}(t,r);try{let a=await fetch("https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.AGENTMAIL_API_KEY}`},body:JSON.stringify({to:[r.email],subject:o,text:n,from_name:"Erlis at Change Risk Radar"})}),i=a.ok,s=i?void 0:await a.text().catch(()=>`HTTP ${a.status}`);return await c.E2.from("crr_nudge_log").insert({org_id:e,nudge_type:t,trial_day:r.trial_day,recipient:r.email,subject:o,delivered:i,error:s??null}),{ok:i,error:s}}catch(n){let a=String(n);return await c.E2.from("crr_nudge_log").insert({org_id:e,nudge_type:t,trial_day:r.trial_day,recipient:r.email,subject:o,delivered:!1,error:a}),{ok:!1,error:a}}}async function g(){let{data:e}=await c.E2.from("crr_orgs").select("id, slug, name, email, magic_token, activation_score, connector_count, first_alert_at, billing_plan, trial_started_at, trial_ends_at").not("trial_started_at","is",null);if(!e?.length)return{processed:0,sent:0,skipped:0,errors:[]};let t=0,r=0,a=[];for(let o of e){let{data:e}=await c.E2.from("crr_subscriptions").select("status, plan_id").eq("org_id",o.id).single();if(e?.status==="active"&&"trial"!==e.plan_id){r++;continue}let n=new Date(o.trial_started_at),i=new Date(o.trial_ends_at?o.trial_ends_at:n.getTime()+12096e5),s=Math.floor((Date.now()-n.getTime())/864e5),l=Math.max(0,Math.ceil((i.getTime()-Date.now())/864e5)),[{count:d},{count:u}]=await Promise.all([c.E2.from("crr_org_alerts").select("id",{count:"exact",head:!0}).eq("org_id",o.id),c.E2.from("crr_alert_reactions").select("id",{count:"exact",head:!0}).eq("org_id",o.id)]),g={org_id:o.id,org_name:o.name,email:o.email,org_slug:o.slug,magic_token:o.magic_token,trial_day:s,days_left:l,connector_count:o.connector_count??0,alert_count:d??0,reaction_count:u??0,activation_score:o.activation_score??0,plan_id:e?.plan_id??"trial"};for(let e of function(e){let t=[],{trial_day:r,connector_count:a,activation_score:o}=e;return 0===r&&t.push("day0_welcome"),r>=1&&0===a&&t.push("day1_connect"),r>=3&&t.push("day3_progress"),r>=7&&t.push("day7_halfway"),r>=10&&o<75&&t.push("day10_nudge"),r>=11&&t.push("day11_expiry"),r>=14&&t.push("day14_last"),t}(g)){let n=await p(o.id,e,g);n.ok?t++:n.error?.includes("already sent")||!n.error?r++:a.push(`${o.slug}:${e}: ${n.error}`)}}return{processed:e.length,sent:t,skipped:r,errors:a}}var _=r(96411),h=r(81597);let y="force-dynamic";async function m(e){let t=e.headers.get("x-cron-secret")??e.nextUrl.searchParams.get("secret"),r=process.env.CRON_SECRET??"crr-cron-2025-secure",a=process.env.PORTAL_SECRET??"crr-portal-2025";if(t!==r&&t!==a)return s.NextResponse.json({error:"Unauthorized"},{status:401});let[o,n]=await Promise.all([g(),(0,_.p4)()]);return(0,h.fH)("Nudge cron completed",{nudges_sent:o.sent,nudges_skipped:o.skipped,orgs_processed:o.processed,trials_swept:n.swept}),s.NextResponse.json({ok:!0,nudges:o,trial_sweep:n,ran_at:new Date().toISOString()})}let f=new o.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/cron/nudges/route",pathname:"/api/cron/nudges",filename:"route",bundlePath:"app/api/cron/nudges/route"},resolvedPagePath:"/tmp/openclaw-workspace/startup-50-change-risk-radar-customer-development-plan-no-int/apps/change-risk-radar/src/app/api/cron/nudges/route.ts",nextConfigOutput:"",userland:a}),{workAsyncStorage:w,workUnitAsyncStorage:v,serverHooks:x}=f;function k(){return(0,i.patchFetch)({workAsyncStorage:w,workUnitAsyncStorage:v})}},78335:()=>{},81597:(e,t,r)=>{"use strict";r.d(t,{Ez:()=>l,Hj:()=>u,Ke:()=>n,NI:()=>_,Ni:()=>w,Pu:()=>g,Xl:()=>h,ZX:()=>y,_3:()=>p,cM:()=>c,fH:()=>s,fI:()=>f,vV:()=>i,vu:()=>m});var a=r(56621);function o(e,t){a.E2.from("crr_pipeline_events").insert({org_id:t.orgId??null,run_id:t.runId??null,alert_id:t.alertId??null,connector_type:t.connectorType??null,event_type:e,latency_ms:t.latencyMs??null,absolute_ms:t.absoluteMs??null,payload:t.payload??{}})}class n{constructor(e,t,r){this.orgId=e,this.connectorType=t,this.startMs=Date.now(),this.lastMs=this.startMs,this.runId=r??crypto.randomUUID(),o("connector_run_start",{orgId:e,runId:this.runId,connectorType:t,latencyMs:0,absoluteMs:0,payload:{connector_type:t,org_id:e}})}event(e,t){let r=Date.now(),a=r-this.lastMs,n=r-this.startMs;this.lastMs=r,o(e,{orgId:this.orgId,runId:this.runId,connectorType:this.connectorType,latencyMs:a,absoluteMs:n,payload:{connector_type:this.connectorType,...t}})}alertCreated(e,t){let r=Date.now(),a=r-this.lastMs,n=r-this.startMs;this.lastMs=r,o("alert_created",{orgId:this.orgId,runId:this.runId,alertId:e,connectorType:this.connectorType,latencyMs:a,absoluteMs:n,payload:{alert_id:e,connector_type:this.connectorType,...t}})}done(e){let t=Date.now()-this.startMs;o("connector_run_end",{orgId:this.orgId,runId:this.runId,connectorType:this.connectorType,latencyMs:t,absoluteMs:t,payload:{connector_type:this.connectorType,alert_count:e??0,total_ms:t}})}}function i(e,t,r){let{orgId:o,errorCode:n,stack:i,severity:s="error",...c}=r;a.E2.from("crr_error_log").insert({org_id:o??null,error_type:e,error_code:n??null,message:t,stack_trace:i??null,severity:s,context:c})}function s(e,t={}){i("system",e,{...t,severity:"info"})}function c(e,t,r={}){let{severity:a,...o}=r;i("connector_failure",t,{...o,errorCode:r.errorCode??"CONNECTOR_ERROR",connectorType:e,severity:a??"error"})}function l(e,t={}){let{severity:r,...a}=t;i("notification",e,{...a,errorCode:t.errorCode??"NOTIFY_FAIL",severity:r??"warning"})}async function d(e,t,r={}){let o=new Date;o.setMinutes(0,0,0),a.E2.from("crr_metrics_snapshots").upsert({snapshot_hour:o.toISOString(),metric_key:e,metric_value:t,dimensions:r.dimensions??null,sample_count:r.sampleCount??1},{onConflict:"snapshot_hour,metric_key,dimensions"})}async function u(){let e={},t=[];try{let{data:t}=await a.E2.from("crr_e2e_latency").select("e2e_latency_ms, connector_type").gte("created_at",new Date(Date.now()-36e5).toISOString());if(t&&t.length>0){let r=t.map(e=>e.e2e_latency_ms).sort((e,t)=>e-t),a=Math.floor(.95*r.length),o=Math.floor(.5*r.length);e.latency_p50=r[o]??0,e.latency_p95=r[a]??0,await d("latency_p50",e.latency_p50,{sampleCount:r.length}),await d("latency_p95",e.latency_p95,{sampleCount:r.length})}}catch(e){t.push(`latency: ${String(e)}`)}try{let{data:t}=await a.E2.from("crr_org_alerts").select("id").eq("severity","critical").gte("created_at",new Date(Date.now()-6048e5).toISOString()),{data:r}=await a.E2.from("crr_alert_reactions").select("alert_id").gte("created_at",new Date(Date.now()-6048e5).toISOString());if(t&&r){let a=new Set(t.map(e=>e.id)),o=[...new Set(r.map(e=>e.alert_id))].filter(e=>a.has(e)).length,n=a.size>0?Math.round(o/a.size*100):0;e.engagement_critical=n,await d("engagement_critical",n,{sampleCount:a.size})}}catch(e){t.push(`engagement: ${String(e)}`)}try{let{data:t}=await a.E2.from("crr_rule_templates").select("trigger_count, last_triggered_at").eq("is_active",!0);if(t){let r=Date.now()-6048e5,a=t.filter(e=>e.last_triggered_at&&new Date(e.last_triggered_at).getTime()>r).length,o=t.length>0?Math.round(a/t.length*100):0;e.rule_hit_rate=o,await d("rule_hit_rate",o,{sampleCount:t.length})}}catch(e){t.push(`rules: ${String(e)}`)}try{let{count:t}=await a.E2.from("crr_error_log").select("id",{count:"exact",head:!0}).gte("created_at",new Date(Date.now()-36e5).toISOString()).in("severity",["error","fatal"]);e.error_rate_1h=t??0,await d("error_rate_1h",t??0,{sampleCount:1})}catch(e){t.push(`errors: ${String(e)}`)}return t.length>0&&function(e,t={}){i("system",e,{...t,severity:"warning"})}("snapshotHourlyMetrics partial failure",{details:t.join("; ")}),{ok:0===t.length,metrics:e}}async function p(){let{data:e}=await a.E2.from("v_latency_percentiles").select("*");if(e&&e.length>0)return e;let{data:t}=await a.E2.from("crr_e2e_latency").select("connector_type, e2e_latency_ms").gte("created_at",new Date(Date.now()-6048e5).toISOString()).order("e2e_latency_ms");if(!t||0===t.length)return[];let r={};for(let e of t){let t=e.connector_type??"unknown";r[t]||(r[t]=[]),r[t].push(e.e2e_latency_ms)}return Object.entries(r).map(([e,t])=>{t.sort((e,t)=>e-t);let r=e=>t[Math.floor(t.length*e)]??0;return{connector_type:e,sample_count:t.length,p50_ms:r(.5),p75_ms:r(.75),p95_ms:r(.95),p99_ms:r(.99),min_ms:t[0],max_ms:t[t.length-1],avg_ms:Math.round(t.reduce((e,t)=>e+t,0)/t.length)}})}async function g(){let{data:e}=await a.E2.from("v_engagement_funnel").select("*");return e??[]}async function _(e=30){let{data:t}=await a.E2.from("v_rule_performance").select("*").order("alert_count",{ascending:!1}).limit(e);return t??[]}async function h(){let{data:e}=await a.E2.from("v_error_summary").select("*");return e??[]}async function y(e=50){let{data:t}=await a.E2.from("crr_error_log").select("id, error_type, error_code, message, severity, context, created_at, resolved").order("created_at",{ascending:!1}).limit(e);return t??[]}async function m(e,t=48){let{data:r}=await a.E2.from("crr_metrics_snapshots").select("snapshot_hour, metric_value, sample_count").eq("metric_key",e).gte("snapshot_hour",new Date(Date.now()-36e5*t).toISOString()).order("snapshot_hour",{ascending:!0});return(r??[]).map(e=>({hour:e.snapshot_hour,value:Number(e.metric_value),sample_count:e.sample_count}))}async function f(){let[e,t,r,o]=await Promise.all([p(),g(),_(5),h()]),n=e.reduce((e,t)=>({p50:e.p50+t.p50_ms*t.sample_count,p95:e.p95+t.p95_ms*t.sample_count,count:e.count+t.sample_count}),{p50:0,p95:0,count:0}),i=n.count>0?Math.round(n.p50/n.count):0,s=n.count>0?Math.round(n.p95/n.count):0,c=t.reduce((e,t)=>e+t.total,0),l=t.reduce((e,t)=>e+t.reacted,0),d=t.find(e=>"critical"===e.severity),u=d?d.engagement_pct:0,y=c>0?Math.round(l/c*100):0,{data:m}=await a.E2.from("crr_rule_templates").select("is_active, trigger_count, last_triggered_at, rule_name").eq("is_active",!0),f=m?.length??0,w=Date.now()-6048e5,v=(m??[]).filter(e=>e.last_triggered_at&&new Date(e.last_triggered_at).getTime()>w).length,x=f>0?Math.round(v/f*100):0,k=(m??[]).filter(e=>!e.trigger_count||0===e.trigger_count).length,b=r[0],I=o.reduce((e,t)=>e+(t.last_1h??0),0),$=o.reduce((e,t)=>e+(t.last_24h??0),0),S=o.reduce((e,t)=>e+(t.unresolved??0),0);return{latency_p50_ms:i,latency_p95_ms:s,latency_sample_count:n.count,engagement_critical_pct:u??0,engagement_overall_pct:y,total_alerts:c,total_reactions:l,active_rules:f,rules_with_triggers:v,rule_hit_rate_pct:x,rules_zero_triggers:k,top_rule_name:b?.rule_name??"—",top_rule_count:b?.alert_count??0,errors_1h:I,errors_24h:$,unresolved_errors:S,avg_detect_ms:e[0]?.avg_ms??0,avg_alert_ms:0}}function w(e,t,r,n){o("alert_reacted",{orgId:t,alertId:e,payload:{alert_id:e,reaction:r,rule_id:n}}),n&&"not_useful"===r&&a.E2.rpc("record_rule_trigger",{p_rule_id:n,p_confidence:0,p_org_id:t})}},96411:(e,t,r)=>{"use strict";r.d(t,{Gk:()=>o,dt:()=>n,p4:()=>i});var a=r(56621);async function o(e){let[{data:t},{data:r}]=await Promise.all([a.E2.from("crr_subscriptions").select("plan_id,status,trial_end,amount_cents").eq("org_id",e).single(),a.E2.from("crr_orgs").select("connector_limit,alert_limit").eq("id",e).single()]);if(!r)return null;let[{count:o},{count:n}]=await Promise.all([a.E2.from("crr_org_connectors").select("id",{count:"exact",head:!0}).eq("org_id",e).eq("status","active"),a.E2.from("crr_org_alerts").select("id",{count:"exact",head:!0}).eq("org_id",e).gte("created_at",new Date(Date.now()-2592e6).toISOString())]),i=r.connector_limit??2,s=r.alert_limit??500,c=o??0,l=n??0,d=t?.trial_end?Math.max(0,Math.ceil((new Date(t.trial_end).getTime()-Date.now())/864e5)):null,u=t?.status??"trialing",p="trialing"===u&&null!==d&&d<=0;return{org_id:e,plan_id:t?.plan_id??"trial",status:p?"paused":u,trial_days_left:d,connector_count:c,connector_limit:i,alerts_this_month:l,alert_limit:s,can_add_connector:!p&&(-1===i||c<i),can_create_alert:!p&&(-1===s||l<s),over_quota:-1!==s&&l>=s||-1!==i&&c>=i,upgrade_url:"/pricing"}}async function n(e){let t=await o(e);return t?t.can_add_connector?null:"paused"===t.status?{error:"Trial expired. Upgrade to continue using connectors.",upgrade_url:"/pricing"}:{error:`Connector limit reached (${t.connector_count}/${t.connector_limit}). Upgrade to Growth for 5 connectors.`,upgrade_url:"/pricing"}:{error:"Org not found",upgrade_url:"/pricing"}}async function i(){let{data:e}=await a.E2.from("crr_subscriptions").select("org_id, trial_end").eq("status","trialing").lt("trial_end",new Date().toISOString());if(!e?.length)return{swept:0,errors:[]};let t=[],r=0;for(let o of e)try{await a.E2.from("crr_subscriptions").update({status:"paused"}).eq("org_id",o.org_id).eq("status","trialing"),r++}catch(e){t.push(`org ${o.org_id}: ${String(e)}`)}return{swept:r,errors:t}}},96487:()=>{}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[4447,3026,580],()=>r(71484));module.exports=a})();