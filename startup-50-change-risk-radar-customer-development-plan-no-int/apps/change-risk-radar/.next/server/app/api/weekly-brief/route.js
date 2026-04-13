(()=>{var e={};e.id=5880,e.ids=[5880],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},56621:(e,t,r)=>{"use strict";r.d(t,{E2:()=>n,_8:()=>i});var o=r(73026);let s="https://lpxhxmpzqjygsaawkrva.supabase.co",a=process.env.SUPABASE_SERVICE_ROLE_KEY;function i(){return(0,o.UU)(s,a,{auth:{persistSession:!1}})}(0,o.UU)(s,"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxweGh4bXB6cWp5Z3NhYXdrcnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDA4NjMsImV4cCI6MjA5MDcxNjg2M30.MZhuBLuFx6tEyCgNYepmaD2HtkngjetiuKeBBnCA1UA");let n=i()},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},78335:()=>{},85524:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>y,routeModule:()=>h,serverHooks:()=>b,workAsyncStorage:()=>x,workUnitAsyncStorage:()=>m});var o={};r.r(o),r.d(o,{GET:()=>u,POST:()=>f,dynamic:()=>c,maxDuration:()=>p});var s=r(96559),a=r(48088),i=r(37719),n=r(32190),l=r(56621),d=r(85811);let c="force-dynamic",p=120;function g(e=new Date){let t=e.getDay(),r=new Date(e);return r.setDate(e.getDate()-(t+6)%7),r.toISOString().slice(0,10)}async function f(e){let t=e.headers.get("authorization"),r=process.env.CRON_SECRET??"crr-cron-2025";if(t!==`Bearer ${r}`)return n.NextResponse.json({error:"Unauthorized"},{status:401});let o=await e.json().catch(()=>({})),s=o.org_id??null,a=o.week_of??g(),i=l.E2.from("crr_orgs").select("*").eq("status","active");s&&(i=i.eq("id",s));let{data:c}=await i;if(!c?.length)return n.NextResponse.json({ok:!0,sent:0,message:"No active orgs"});let p=new Date(a+"T00:00:00Z"),f=new Date(p.getTime()+6048e5),u=[];for(let e of c)try{let{data:t}=await l.E2.from("crr_org_alerts").select("*").eq("org_id",e.id).gte("created_at",p.toISOString()).lt("created_at",f.toISOString()).order("risk_level",{ascending:!1}).order("created_at",{ascending:!1}),r=t??[],o=await (0,d.Qz)({to:e.email,orgName:e.name,orgSlug:e.slug,magicToken:e.magic_token,weekOf:a,alerts:r});await l.E2.from("crr_weekly_briefs").upsert({org_id:e.id,week_of:a,alerts_count:r.length,critical_count:r.filter(e=>"high"===e.risk_level).length,email_to:e.email,sent_at:o.success?new Date().toISOString():null,email_status:o.success?"sent":"failed",summary:{risk_breakdown:r.reduce((e,t)=>(e[t.risk_level]=(e[t.risk_level]||0)+1,e),{}),top_vendors:[...new Set(r.map(e=>e.vendor_slug))].slice(0,5),email_error:o.error}},{onConflict:"org_id,week_of"}),u.push({org:e.slug,email:e.email,alerts:r.length,sent:o.success,error:o.error})}catch(t){u.push({org:e.slug,error:String(t)})}return n.NextResponse.json({ok:!0,week_of:a,sent:u.filter(e=>e.sent).length,results:u})}async function u(e){let t=e.headers.get("x-org-token")||e.nextUrl.searchParams.get("token"),r=e.headers.get("authorization"),o=process.env.CRON_SECRET??"crr-cron-2025";if(!t&&(!r||r===`Bearer ${o}`)){let e=g(),{data:t}=await l.E2.from("crr_orgs").select("*").eq("status","active"),r=[];for(let o of t??[])try{let{data:t}=await l.E2.from("crr_org_alerts").select("*").eq("org_id",o.id).gte("created_at",new Date(Date.now()-6048e5).toISOString()).order("risk_level",{ascending:!1}).limit(50),s=t??[],a=await (0,d.Qz)({to:o.email,orgName:o.name,orgSlug:o.slug,magicToken:o.magic_token,weekOf:e,alerts:s});await l.E2.from("crr_weekly_briefs").upsert({org_id:o.id,week_of:e,alerts_count:s.length,critical_count:s.filter(e=>"high"===e.risk_level).length,email_to:o.email,sent_at:a.success?new Date().toISOString():null,email_status:a.success?"sent":"failed",summary:{}},{onConflict:"org_id,week_of"}),r.push({org:o.slug,alerts:s.length,sent:a.success})}catch(e){r.push({org:o.slug,error:String(e)})}return n.NextResponse.json({ok:!0,cron:!0,week_of:e,sent:r.filter(e=>e.sent).length,results:r})}let s=null;if(r===`Bearer ${o}`)s=e.nextUrl.searchParams.get("org_id");else if(t){let{data:e}=await l.E2.from("crr_orgs").select("id").eq("magic_token",t).single();s=e?.id??null}if(!s)return n.NextResponse.json({error:"Unauthorized"},{status:401});let{data:a}=await l.E2.from("crr_weekly_briefs").select("*").eq("org_id",s).order("week_of",{ascending:!1}).limit(12);return n.NextResponse.json({briefs:a??[]})}let h=new s.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/weekly-brief/route",pathname:"/api/weekly-brief",filename:"route",bundlePath:"app/api/weekly-brief/route"},resolvedPagePath:"/tmp/openclaw-workspace/startup-50-change-risk-radar-customer-development-plan-no-int/apps/change-risk-radar/src/app/api/weekly-brief/route.ts",nextConfigOutput:"",userland:o}),{workAsyncStorage:x,workUnitAsyncStorage:m,serverHooks:b}=h;function y(){return(0,i.patchFetch)({workAsyncStorage:x,workUnitAsyncStorage:m})}},85811:(e,t,r)=>{"use strict";r.d(t,{Qz:()=>n,v4:()=>l});let o="scide-founder@agentmail.to",s="https://api.agentmail.to/v0",a={high:"\uD83D\uDD34",medium:"\uD83D\uDFE1",low:"\uD83D\uDFE2"},i={pricing:"\uD83D\uDCB0",legal:"⚖️",operational:"\uD83D\uDD27",security:"\uD83D\uDD12",vendor_risk:"\uD83C\uDFE2"};async function n(e){let t=function(e){let{orgName:t,orgSlug:r,magicToken:o,weekOf:s,alerts:n,baseUrl:l="https://change-risk-radar.vercel.app"}=e,d=`${l}/dashboard/${r}?token=${o}`,c=n.filter(e=>"high"===e.risk_level),p=n.filter(e=>"medium"===e.risk_level),g=n.filter(e=>"low"===e.risk_level),f=n.slice(0,10).map(e=>`
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 10px 8px; white-space: nowrap;">
        <span style="display:inline-block; padding:2px 8px; border-radius:9999px; font-size:11px; font-weight:700;
          background:${"high"===e.risk_level?"#fee2e2":"medium"===e.risk_level?"#fef3c7":"#d1fae5"};
          color:${"high"===e.risk_level?"#991b1b":"medium"===e.risk_level?"#92400e":"#065f46"}">
          ${a[e.risk_level]??""} ${e.risk_level.toUpperCase()}
        </span>
      </td>
      <td style="padding: 10px 8px; font-size:12px; color:#6b7280;">${i[e.risk_category]??"\uD83D\uDCCA"} ${e.risk_category}</td>
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
        <div style="font-size:13px; color:#a5b4fc; margin-top:4px;">Weekly Brief \xb7 Week of ${s}</div>
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
          <tbody>${f}</tbody>
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
          <a href="${l}/unsubscribe?token=${o}" style="color:#9ca3af">Unsubscribe</a> \xb7 
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
</html>`}(e),r=`[Change Risk Radar] ${e.alerts.length} alert${1!==e.alerts.length?"s":""} — Week of ${e.weekOf}`,n=process.env.AGENTMAIL_API_KEY;if(!n)return{success:!1,error:"AGENTMAIL_API_KEY not set"};try{let a=await fetch(`${s}/inboxes/${o}/messages/send`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({to:[e.to],subject:r,html:t,text:`Change Risk Radar — Week of ${e.weekOf}

${e.alerts.length} alert(s) for ${e.orgName}.

View at: https://change-risk-radar.vercel.app/dashboard/${e.orgSlug}?token=${e.magicToken}`})}),i=await a.json().catch(()=>({}));if(!a.ok)return{success:!1,error:JSON.stringify(i)};return{success:!0}}catch(e){return{success:!1,error:String(e)}}}async function l(e){let t=`https://change-risk-radar.vercel.app/dashboard/${e.orgSlug}?token=${e.magicToken}`,r=`<!DOCTYPE html>
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
</html>`,a=process.env.AGENTMAIL_API_KEY;if(!a)return{success:!1,error:"AGENTMAIL_API_KEY not set"};try{let t=await fetch(`${s}/inboxes/${o}/messages/send`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${a}`},body:JSON.stringify({to:[e.to],subject:"\uD83C\uDF89 Your Change Risk Radar early access is live",html:r})}),i=await t.json().catch(()=>({}));if(!t.ok)return{success:!1,error:JSON.stringify(i)};return{success:!0}}catch(e){return{success:!1,error:String(e)}}}},96487:()=>{}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),o=t.X(0,[4447,3026,580],()=>r(85524));module.exports=o})();