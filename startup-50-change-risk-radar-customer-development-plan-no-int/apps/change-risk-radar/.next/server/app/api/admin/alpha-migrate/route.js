(()=>{var e={};e.id=4022,e.ids=[4022],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},47356:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>y,routeModule:()=>h,serverHooks:()=>m,workAsyncStorage:()=>f,workUnitAsyncStorage:()=>x});var a={};r.r(a),r.d(a,{GET:()=>u,POST:()=>g,dynamic:()=>c,maxDuration:()=>p});var o=r(96559),i=r(48088),s=r(37719),n=r(32190),l=r(56621),d=r(85811);let c="force-dynamic",p=120;async function g(e){let t=e.headers.get("authorization"),r=process.env.CRON_SECRET??"crr-cron-2025";if(t!==`Bearer ${r}`)return n.NextResponse.json({error:"Unauthorized"},{status:401});let a=await e.json().catch(()=>({})),o=!0===a.dry_run,i=!0===a.notify,{data:s}=await l.E2.from("crr_orgs").select("id, slug, name, email, magic_token, phase, status, created_at"),c=[];for(let e of s??[]){let{data:t}=await l.E2.from("crr_org_connectors").select("id, type, status").eq("org_id",e.id),r=(t??[]).filter(e=>"active"===e.status),a=r.length,s=new Set(r.map(e=>e.type)),n=a>=2,{data:p}=await l.E2.from("crr_org_alerts").select("id, created_at, risk_level").eq("org_id",e.id).order("created_at",{ascending:!0}),g=(p??[]).length,u=(p??[]).filter(e=>"high"===e.risk_level).length,h=(p??[])[0]?.created_at??null,{data:f}=await l.E2.from("crr_alert_reactions").select("id, reaction").eq("org_id",e.id),x=(f??[]).length,m=(f??[]).filter(e=>["useful","acknowledge","snooze"].includes(e.reaction)).length,y=25*Math.min(a,2)+25*(g>0)+25*(x>0),b=new Date(e.created_at??Date.now()),_=h?new Date(h):null,v=_?(_.getTime()-b.getTime())/36e5:null,k=(e.phase,"alpha"),w={phase:k,activation_score:y,connector_count:a,first_alert_at:h,alpha_migrated_at:new Date().toISOString(),last_active_at:new Date().toISOString()};if(!o&&(await l.E2.from("crr_orgs").update(w).eq("id",e.id),i&&e.email)){e.slug,e.magic_token;let t=r.map(e=>e.type);await (0,d.v4)({to:e.email,orgName:e.name,orgSlug:e.slug,magicToken:e.magic_token,connectorTypes:t}).catch(()=>null)}c.push({org_slug:e.slug,org_name:e.name,phase:k,connector_count:a,connector_types:[...s],has_multiple_connectors:n,total_alerts:g,critical_alerts:u,first_alert_at:h,ttfv_hours:null!==v?Math.round(10*v)/10:null,ttfv_within_24h:null!==v&&v<=24,reaction_count:x,engaged_reactions:m,activation_score:y,applied:!o})}let p=c.length,g=c.filter(e=>e.has_multiple_connectors).length,u=c.filter(e=>e.ttfv_within_24h).length,h=p>0?Math.round(c.reduce((e,t)=>e+t.activation_score,0)/p):0,f=c.filter(e=>e.total_alerts>0).length;return n.NextResponse.json({dry_run:o,orgs_migrated:p,results:c,summary:{orgs_total:p,orgs_with_2_connectors:g,activation_pct_2_connectors:p>0?Math.round(g/p*100):0,orgs_first_alert_24h:u,pct_first_alert_24h:p>0?Math.round(u/p*100):0,orgs_with_alerts:f,avg_activation_score:h,success_criteria:{activation_2_connectors:{target:"≥70%",current:`${p>0?Math.round(g/p*100):0}%`,met:g/Math.max(p,1)>=.7},median_ttfv_24h:{target:"≤1 day",current_orgs:u,met:u/Math.max(p,1)>=.5}}}})}async function u(e){let t=e.headers.get("authorization"),r=process.env.CRON_SECRET??"crr-cron-2025";return t!==`Bearer ${r}`?n.NextResponse.json({error:"Unauthorized"},{status:401}):g(e)}let h=new o.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/admin/alpha-migrate/route",pathname:"/api/admin/alpha-migrate",filename:"route",bundlePath:"app/api/admin/alpha-migrate/route"},resolvedPagePath:"/tmp/openclaw-workspace/startup-50-change-risk-radar-customer-development-plan-no-int/apps/change-risk-radar/src/app/api/admin/alpha-migrate/route.ts",nextConfigOutput:"",userland:a}),{workAsyncStorage:f,workUnitAsyncStorage:x,serverHooks:m}=h;function y(){return(0,s.patchFetch)({workAsyncStorage:f,workUnitAsyncStorage:x})}},56621:(e,t,r)=>{"use strict";r.d(t,{E2:()=>n,_8:()=>s});var a=r(73026);let o="https://lpxhxmpzqjygsaawkrva.supabase.co",i=process.env.SUPABASE_SERVICE_ROLE_KEY;function s(){return(0,a.UU)(o,i,{auth:{persistSession:!1}})}(0,a.UU)(o,"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxweGh4bXB6cWp5Z3NhYXdrcnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDA4NjMsImV4cCI6MjA5MDcxNjg2M30.MZhuBLuFx6tEyCgNYepmaD2HtkngjetiuKeBBnCA1UA");let n=s()},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},78335:()=>{},85811:(e,t,r)=>{"use strict";r.d(t,{Qz:()=>n,v4:()=>l});let a="scide-founder@agentmail.to",o="https://api.agentmail.to/v0",i={high:"\uD83D\uDD34",medium:"\uD83D\uDFE1",low:"\uD83D\uDFE2"},s={pricing:"\uD83D\uDCB0",legal:"⚖️",operational:"\uD83D\uDD27",security:"\uD83D\uDD12",vendor_risk:"\uD83C\uDFE2"};async function n(e){let t=function(e){let{orgName:t,orgSlug:r,magicToken:a,weekOf:o,alerts:n,baseUrl:l="https://change-risk-radar.vercel.app"}=e,d=`${l}/dashboard/${r}?token=${a}`,c=n.filter(e=>"high"===e.risk_level),p=n.filter(e=>"medium"===e.risk_level),g=n.filter(e=>"low"===e.risk_level),u=n.slice(0,10).map(e=>`
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 10px 8px; white-space: nowrap;">
        <span style="display:inline-block; padding:2px 8px; border-radius:9999px; font-size:11px; font-weight:700;
          background:${"high"===e.risk_level?"#fee2e2":"medium"===e.risk_level?"#fef3c7":"#d1fae5"};
          color:${"high"===e.risk_level?"#991b1b":"medium"===e.risk_level?"#92400e":"#065f46"}">
          ${i[e.risk_level]??""} ${e.risk_level.toUpperCase()}
        </span>
      </td>
      <td style="padding: 10px 8px; font-size:12px; color:#6b7280;">${s[e.risk_category]??"\uD83D\uDCCA"} ${e.risk_category}</td>
      <td style="padding: 10px 8px; font-size:13px; color:#111827; font-weight:600;">${e.vendor_slug}</td>
      <td style="padding: 10px 8px; font-size:13px; color:#374151;">${e.title}</td>
    </tr>`).join("");return`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#f9fafb; margin:0; padding:0;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff; border-radius:12px; border:1px solid #e5e7eb; overflow:hidden;">
      
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#1e1b4b,#312e81); padding:28px 32px;">
        <div style="font-size:20px; font-weight:800; color:#fff;">📡 Change Risk Radar</div>
        <div style="font-size:13px; color:#a5b4fc; margin-top:4px;">Weekly Brief \xb7 Week of ${o}</div>
        <div style="font-size:15px; color:#e0e7ff; margin-top:8px; font-weight:600;">${t}</div>
      </td></tr>

      <!-- Stats row -->
      <tr><td style="padding:20px 32px; background:#f8fafc; border-bottom:1px solid #e5e7eb;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            ${[{label:"Total Alerts",value:n.length,color:"#6366f1"},{label:"\uD83D\uDD34 High Risk",value:c.length,color:"#ef4444"},{label:"\uD83D\uDFE1 Medium",value:p.length,color:"#f59e0b"},{label:"\uD83D\uDFE2 Low",value:g.length,color:"#10b981"}].map(e=>`<td align="center" style="width:25%">
              <div style="font-size:24px; font-weight:800; color:${e.color}">${e.value}</div>
              <div style="font-size:11px; color:#6b7280; margin-top:2px">${e.label}</div>
            </td>`).join("")}
          </tr>
        </table>
      </td></tr>

      <!-- Alert list -->
      <tr><td style="padding:24px 32px;">
        <div style="font-size:15px; font-weight:700; color:#111827; margin-bottom:12px;">
          This Week's Alerts ${n.length>10?`(showing top 10 of ${n.length})`:""}
        </div>
        ${0===n.length?`<p style="color:#6b7280; font-size:14px;">No alerts this week — your vendors were quiet.</p>`:`
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; font-size:13px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:8px; text-align:left; font-size:11px; color:#6b7280; font-weight:600;">RISK</th>
              <th style="padding:8px; text-align:left; font-size:11px; color:#6b7280; font-weight:600;">CATEGORY</th>
              <th style="padding:8px; text-align:left; font-size:11px; color:#6b7280; font-weight:600;">VENDOR</th>
              <th style="padding:8px; text-align:left; font-size:11px; color:#6b7280; font-weight:600;">CHANGE</th>
            </tr>
          </thead>
          <tbody>${u}</tbody>
        </table>`}
        
        <div style="margin-top:20px; text-align:center;">
          <a href="${d}" style="display:inline-block; background:#4f46e5; color:#fff; text-decoration:none;
            padding:12px 28px; border-radius:8px; font-weight:700; font-size:14px;">
            View Full Dashboard →
          </a>
        </div>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:20px 32px; background:#f8fafc; border-top:1px solid #e5e7eb;">
        <p style="font-size:12px; color:#9ca3af; margin:0;">
          Change Risk Radar \xb7 Early Access \xb7 
          <a href="${l}/unsubscribe?token=${a}" style="color:#9ca3af">Unsubscribe</a> \xb7 
          All deposits 100% refundable
        </p>
        <p style="font-size:11px; color:#d1d5db; margin:4px 0 0;">
          You're receiving this because you signed up for early access. 
          Reply to this email with questions.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`}(e),r=`[Change Risk Radar] ${e.alerts.length} alert${1!==e.alerts.length?"s":""} — Week of ${e.weekOf}`,n=process.env.AGENTMAIL_API_KEY;if(!n)return{success:!1,error:"AGENTMAIL_API_KEY not set"};try{let i=await fetch(`${o}/inboxes/${a}/messages/send`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({to:[e.to],subject:r,html:t,text:`Change Risk Radar — Week of ${e.weekOf}

${e.alerts.length} alert(s) for ${e.orgName}.

View at: https://change-risk-radar.vercel.app/dashboard/${e.orgSlug}?token=${e.magicToken}`})}),s=await i.json().catch(()=>({}));if(!i.ok)return{success:!1,error:JSON.stringify(s)};return{success:!0}}catch(e){return{success:!1,error:String(e)}}}async function l(e){let t=`https://change-risk-radar.vercel.app/dashboard/${e.orgSlug}?token=${e.magicToken}`,r=`<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#f9fafb; padding:32px; margin:0;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff; border-radius:12px; border:1px solid #e5e7eb; padding:32px; margin:0 auto;">
  <tr><td>
    <div style="font-size:24px; font-weight:800; color:#312e81;">📡 Welcome to Change Risk Radar</div>
    <p style="color:#374151; font-size:15px;">Hi ${e.orgName},</p>
    <p style="color:#374151; font-size:14px;">Your early access account is live. We've connected your vendors and are already scanning for changes that could impact your business.</p>
    
    <div style="background:#f0f0ff; border-radius:8px; padding:16px; margin:20px 0;">
      <div style="font-weight:700; color:#312e81; margin-bottom:8px;">Your Connected Detectors:</div>
      ${e.connectorTypes.map(e=>`<div style="color:#4f46e5; font-size:14px;">✓ ${"workspace"===e?"Google Workspace":"stripe"===e?"Stripe":"tos_url"===e?"Custom Policy URLs":e}</div>`).join("")}
    </div>
    
    <a href="${t}" style="display:inline-block; background:#4f46e5; color:#fff; text-decoration:none; padding:14px 32px; border-radius:8px; font-weight:700; font-size:15px; margin:16px 0;">
      Open Your Dashboard →
    </a>
    
    <p style="color:#6b7280; font-size:13px;">Bookmark that link — it's your personal dashboard URL. You'll also receive a weekly brief every Monday morning.</p>
    <p style="color:#6b7280; font-size:13px;">Questions? Just reply to this email.</p>
    <p style="color:#9ca3af; font-size:12px; margin-top:24px; border-top:1px solid #e5e7eb; padding-top:16px;">Change Risk Radar \xb7 Early Access \xb7 All deposits 100% refundable</p>
  </td></tr>
</table>
</body>
</html>`,i=process.env.AGENTMAIL_API_KEY;if(!i)return{success:!1,error:"AGENTMAIL_API_KEY not set"};try{let t=await fetch(`${o}/inboxes/${a}/messages/send`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${i}`},body:JSON.stringify({to:[e.to],subject:"\uD83C\uDF89 Your Change Risk Radar early access is live",html:r})}),s=await t.json().catch(()=>({}));if(!t.ok)return{success:!1,error:JSON.stringify(s)};return{success:!0}}catch(e){return{success:!1,error:String(e)}}}},96487:()=>{}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[4447,3026,580],()=>r(47356));module.exports=a})();