"use strict";(()=>{var e={};e.id=8227,e.ids=[8227],e.modules={1376:(e,t,r)=>{r.r(t),r.d(t,{patchFetch:()=>y,routeModule:()=>u,serverHooks:()=>b,workAsyncStorage:()=>h,workUnitAsyncStorage:()=>x});var o={};r.r(o),r.d(o,{GET:()=>f,POST:()=>g,dynamic:()=>c});var a=r(96559),s=r(48088),i=r(37719),n=r(32190),l=r(56621),d=r(99512),p=r(85811);let c="force-dynamic";async function g(e){try{let{name:t,email:r,tos_agreed:o,dpa_agreed:a,connectors:s}=await e.json();if(!t||!r)return n.NextResponse.json({error:"name and email required"},{status:400});if(!o||!a)return n.NextResponse.json({error:"Must agree to ToS and DPA"},{status:400});let i=t.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40),c=function(){let e=new Uint8Array(24);for(let t=0;t<24;t++)e[t]=Math.floor(256*Math.random());return Array.from(e).map(e=>e.toString(16).padStart(2,"0")).join("")}(),g=e.headers.get("x-forwarded-for")?.split(",")[0]||e.headers.get("x-real-ip")||null,f=i,{data:u}=await l.E2.from("crr_orgs").select("slug").eq("slug",i);u?.length&&(f=`${i}-${Date.now().toString(36)}`);let{data:h,error:x}=await l.E2.from("crr_orgs").insert({slug:f,name:t,email:r,plan:"early_access",status:"active",tos_agreed_at:new Date().toISOString(),dpa_agreed_at:new Date().toISOString(),tos_ip:g,magic_token:c,config:{source:"self_serve_onboarding"}}).select().single();if(x)return console.error("Org create error:",x),n.NextResponse.json({error:"Failed to create org"},{status:500});let b=[];if(s?.length){let e=s.map(e=>({org_id:h.id,type:e.type,label:e.label||e.type,config:e.config||{},status:"active"}));await l.E2.from("crr_org_connectors").insert(e),b.push(...s.map(e=>e.type))}else await l.E2.from("crr_org_connectors").insert([{org_id:h.id,type:"stripe",label:"Stripe",config:{min_risk:"medium"},status:"active"},{org_id:h.id,type:"workspace",label:"Google Workspace",config:{min_risk:"medium"},status:"active"}]),b.push("stripe","workspace");let y=await (0,d.Ms)(h.id);return(0,p.v4)({to:r,orgName:t,orgSlug:f,magicToken:c,connectorTypes:b}).catch(e=>console.error("Welcome email error:",e)),fetch("https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.AGENTMAIL_API_KEY}`},body:JSON.stringify({to:["scide-founder@agentmail.to"],subject:`🎉 New early access org: ${t}`,text:`New org onboarded!

Name: ${t}
Email: ${r}
Slug: ${f}
Connectors: ${b.join(", ")}
Initial alerts: ${y.newAlerts}

Dashboard: https://change-risk-radar.vercel.app/dashboard/${f}?token=${c}`})}).catch(()=>{}),n.NextResponse.json({success:!0,org_slug:f,magic_token:c,dashboard_url:`https://change-risk-radar.vercel.app/dashboard/${f}?token=${c}`,initial_alerts:y.newAlerts,connectors:b.length})}catch(e){return console.error("Org POST error:",e),n.NextResponse.json({error:String(e)},{status:500})}}async function f(e){let t=e.headers.get("authorization"),r=process.env.CRON_SECRET??"crr-cron-2025";if(t!==`Bearer ${r}`)return n.NextResponse.json({error:"Unauthorized"},{status:401});let{data:o}=await l.E2.from("crr_orgs").select("id, slug, name, email, plan, status, created_at, tos_agreed_at").order("created_at",{ascending:!1});return n.NextResponse.json({orgs:o??[]})}let u=new a.AppRouteRouteModule({definition:{kind:s.RouteKind.APP_ROUTE,page:"/api/orgs/route",pathname:"/api/orgs",filename:"route",bundlePath:"app/api/orgs/route"},resolvedPagePath:"/tmp/openclaw-workspace/startup-50-change-risk-radar-customer-development-plan-no-int/apps/change-risk-radar/src/app/api/orgs/route.ts",nextConfigOutput:"",userland:o}),{workAsyncStorage:h,workUnitAsyncStorage:x,serverHooks:b}=u;function y(){return(0,i.patchFetch)({workAsyncStorage:h,workUnitAsyncStorage:x})}},3295:e=>{e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},29294:e=>{e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},44870:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},63033:e=>{e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},85811:(e,t,r)=>{r.d(t,{Qz:()=>n,v4:()=>l});let o="scide-founder@agentmail.to",a="https://api.agentmail.to/v0",s={high:"\uD83D\uDD34",medium:"\uD83D\uDFE1",low:"\uD83D\uDFE2"},i={pricing:"\uD83D\uDCB0",legal:"⚖️",operational:"\uD83D\uDD27",security:"\uD83D\uDD12",vendor_risk:"\uD83C\uDFE2"};async function n(e){let t=function(e){let{orgName:t,orgSlug:r,magicToken:o,weekOf:a,alerts:n,baseUrl:l="https://change-risk-radar.vercel.app"}=e,d=`${l}/dashboard/${r}?token=${o}`,p=n.filter(e=>"high"===e.risk_level),c=n.filter(e=>"medium"===e.risk_level),g=n.filter(e=>"low"===e.risk_level),f=n.slice(0,10).map(e=>`
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 10px 8px; white-space: nowrap;">
        <span style="display:inline-block; padding:2px 8px; border-radius:9999px; font-size:11px; font-weight:700;
          background:${"high"===e.risk_level?"#fee2e2":"medium"===e.risk_level?"#fef3c7":"#d1fae5"};
          color:${"high"===e.risk_level?"#991b1b":"medium"===e.risk_level?"#92400e":"#065f46"}">
          ${s[e.risk_level]??""} ${e.risk_level.toUpperCase()}
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
        <div style="font-size:13px; color:#a5b4fc; margin-top:4px;">Weekly Brief \xb7 Week of ${a}</div>
        <div style="font-size:15px; color:#e0e7ff; margin-top:8px; font-weight:600;">${t}</div>
      </td></tr>

      <!-- Stats row -->
      <tr><td style="padding:20px 32px; background:#f8fafc; border-bottom:1px solid #e5e7eb;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            ${[{label:"Total Alerts",value:n.length,color:"#6366f1"},{label:"\uD83D\uDD34 High Risk",value:p.length,color:"#ef4444"},{label:"\uD83D\uDFE1 Medium",value:c.length,color:"#f59e0b"},{label:"\uD83D\uDFE2 Low",value:g.length,color:"#10b981"}].map(e=>`<td align="center" style="width:25%">
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
</html>`}(e),r=`[Change Risk Radar] ${e.alerts.length} alert${1!==e.alerts.length?"s":""} — Week of ${e.weekOf}`,n=process.env.AGENTMAIL_API_KEY;if(!n)return{success:!1,error:"AGENTMAIL_API_KEY not set"};try{let s=await fetch(`${a}/inboxes/${o}/messages/send`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({to:[e.to],subject:r,html:t,text:`Change Risk Radar — Week of ${e.weekOf}

${e.alerts.length} alert(s) for ${e.orgName}.

View at: https://change-risk-radar.vercel.app/dashboard/${e.orgSlug}?token=${e.magicToken}`})}),i=await s.json().catch(()=>({}));if(!s.ok)return{success:!1,error:JSON.stringify(i)};return{success:!0}}catch(e){return{success:!1,error:String(e)}}}async function l(e){let t=`https://change-risk-radar.vercel.app/dashboard/${e.orgSlug}?token=${e.magicToken}`,r=`<!DOCTYPE html>
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
</html>`,s=process.env.AGENTMAIL_API_KEY;if(!s)return{success:!1,error:"AGENTMAIL_API_KEY not set"};try{let t=await fetch(`${a}/inboxes/${o}/messages/send`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${s}`},body:JSON.stringify({to:[e.to],subject:"\uD83C\uDF89 Your Change Risk Radar early access is live",html:r})}),i=await t.json().catch(()=>({}));if(!t.ok)return{success:!1,error:JSON.stringify(i)};return{success:!0}}catch(e){return{success:!1,error:String(e)}}}}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),o=t.X(0,[4447,3026,580,9358,9512],()=>r(1376));module.exports=o})();