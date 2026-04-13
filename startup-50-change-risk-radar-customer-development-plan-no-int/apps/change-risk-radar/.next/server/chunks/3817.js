"use strict";exports.id=3817,exports.ids=[3817],exports.modules={3817:(e,t,r)=>{r.d(t,{bb:()=>n,oL:()=>m,s9:()=>h});var a=r(56621),i=r(81597);let o={critical:4,high:3,medium:2,low:1};async function n(e,t={}){let{dryRun:r=!1}=t,{data:l}=await a.E2.from("crr_notification_channels").select("*").eq("org_id",e.org_id).eq("is_active",!0);if(!l?.length)return[];let c=o[e.severity??e.risk_level??"medium"]??2,p=[];for(let t of l){let n;if(c<(o[t.config.min_severity??"high"]??3)){p.push({channel_id:t.id,channel_type:t.type,status:"skipped",latency_ms:0});continue}if(!r&&await s(t.id,e.title)){p.push({channel_id:t.id,channel_type:t.type,status:"rate_limited",latency_ms:0});continue}let l=Date.now(),g="failed";if(r)g="sent";else try{switch(t.type){case"slack_webhook":await d(t,e),g="sent";break;case"email":await u(t,e),g="sent";break;case"webhook":await f(t,e),g="sent";break;case"pagerduty":await y(t,e),g="sent"}}catch(r){n=r instanceof Error?r.message:String(r),g="failed",(0,i.Ez)(n,{errorCode:"CHANNEL_SEND_FAIL",connectorType:t.type,alertId:e.id,orgId:e.org_id})}let h=Date.now()-l;r||(a.E2.from("crr_notification_log").insert({org_id:e.org_id,channel_id:t.id,alert_id:e.id,channel_type:t.type,status:g,error_message:n??null,latency_ms:h}),a.E2.from("crr_notification_channels").update("sent"===g?{last_triggered_at:new Date().toISOString(),trigger_count:t.trigger_count+1}:{error_count:t.error_count+1,last_error:n??null}).eq("id",t.id)),p.push({channel_id:t.id,channel_type:t.type,status:g,error:n,latency_ms:h})}return p}async function s(e,t){let r=new Date(Date.now()-3e5).toISOString(),{data:i}=await a.E2.from("crr_notification_log").select("id").eq("channel_id",e).eq("status","sent").gte("created_at",r).limit(1);return(i?.length??0)>0}let l={critical:"#ef4444",high:"#f59e0b",medium:"#6366f1",low:"#10b981"},c={pricing:"\uD83D\uDCB0",legal:"⚖️",operational:"\uD83D\uDD27",security:"\uD83D\uDD12",vendor_risk:"\uD83C\uDFE2"};async function d(e,t){let r=e.config.webhook_url;if(!r)throw Error("Slack webhook URL not configured");let a=function(e,t){let r=t.severity??t.risk_level??"high",a=l[r]??"#6366f1",i=c[t.risk_category]??"⚡",o=t.vendor_slug.replace(/-/g," ").replace(/\b\w/g,e=>e.toUpperCase()),n="https://change-risk-radar.vercel.app";return{username:e.config.username??"Change Risk Radar",icon_emoji:e.config.icon_emoji??":radar:",...e.config.channel?{channel:e.config.channel}:{},attachments:[{color:a,fallback:`[${r.toUpperCase()}] ${t.title}`,blocks:[{type:"section",text:{type:"mrkdwn",text:`${i} *${t.title}*
${t.summary?.slice(0,200)??""}`}},{type:"section",fields:[{type:"mrkdwn",text:`*Severity*
${r.toUpperCase()}`},{type:"mrkdwn",text:`*Category*
${t.risk_category}`},{type:"mrkdwn",text:`*Vendor*
${o}`},{type:"mrkdwn",text:`*Detected*
<!date^${Math.floor(new Date(t.created_at).getTime()/1e3)}^{date_short_pretty} {time}|${t.created_at}>`}]},{type:"actions",elements:[{type:"button",text:{type:"plain_text",text:"View Alert →"},url:n,style:"primary"},...t.source_url?[{type:"button",text:{type:"plain_text",text:"Source"},url:t.source_url}]:[]]},{type:"context",elements:[{type:"mrkdwn",text:`🔍 Change Risk Radar • <${n}|Manage alerts>`}]}]}]}}(e,t),i=await fetch(r,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)});if(!i.ok){let e=await i.text().catch(()=>i.statusText);throw Error(`Slack API error ${i.status}: ${e}`)}}let p={critical:"#ef4444",high:"#f59e0b",medium:"#6366f1",low:"#10b981"};function g(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}async function u(e,t){let r=e.config.to;if(!r)throw Error("Email recipient not configured");let a=t.severity??t.risk_level??"high",i=`[${a.toUpperCase()}] ${t.title} — Change Risk Radar`,o=function(e){let t=e.severity??e.risk_level??"high",r=p[t]??"#6366f1",a=c[e.risk_category]??"⚡",i=e.vendor_slug.replace(/-/g," ").replace(/\b\w/g,e=>e.toUpperCase()),o="https://change-risk-radar.vercel.app",n=new Date(e.created_at).toLocaleString("en-US",{timeZone:"UTC",dateStyle:"medium",timeStyle:"short"});return`<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;padding:24px;margin:0;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td>
  <div style="max-width:580px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background:#1a1a2e;padding:20px 24px;border-top:4px solid ${r};">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:20px;">🔍</span>
        <span style="color:white;font-weight:700;font-size:16px;">Change Risk Radar</span>
        <span style="margin-left:auto;background:${r};color:white;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;">${t}</span>
      </div>
    </div>
    <!-- Alert body -->
    <div style="padding:24px;">
      <div style="font-size:18px;font-weight:700;color:#1a1a2e;margin-bottom:8px;">${a} ${g(e.title)}</div>
      <div style="color:#6b7280;font-size:14px;line-height:1.6;margin-bottom:20px;">${g(e.summary?.slice(0,300)??"")}</div>

      <!-- Metadata grid -->
      <table width="100%" style="margin-bottom:20px;">
        <tr>
          <td style="padding:8px;background:#f9fafb;border-radius:6px;font-size:12px;color:#6b7280;width:33%;">
            <div style="font-weight:600;color:#374151;margin-bottom:2px;">Vendor</div>
            ${g(i)}
          </td>
          <td style="width:8px;"></td>
          <td style="padding:8px;background:#f9fafb;border-radius:6px;font-size:12px;color:#6b7280;width:33%;">
            <div style="font-weight:600;color:#374151;margin-bottom:2px;">Category</div>
            ${g(e.risk_category)}
          </td>
          <td style="width:8px;"></td>
          <td style="padding:8px;background:#f9fafb;border-radius:6px;font-size:12px;color:#6b7280;width:33%;">
            <div style="font-weight:600;color:#374151;margin-bottom:2px;">Detected</div>
            ${n} UTC
          </td>
        </tr>
      </table>

      <!-- CTAs -->
      <div style="display:flex;gap:12px;">
        <a href="${o}" style="background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View & React →</a>
        ${e.source_url?`<a href="${g(e.source_url)}" style="background:#f3f4f6;color:#374151;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Source</a>`:""}
      </div>
    </div>
    <!-- Footer -->
    <div style="padding:16px 24px;border-top:1px solid #e5e7eb;background:#f9fafb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        You're receiving this because your organization has alerts configured.
        <a href="${o}" style="color:#4f46e5;">Manage notification settings →</a>
      </p>
    </div>
  </div>
</td></tr>
</table>
</body>
</html>`}(t),n=`${t.title}

${t.summary??""}

Vendor: ${t.vendor_slug}
Severity: ${a}
Category: ${t.risk_category}

View: https://change-risk-radar.vercel.app`,s=process.env.AGENTMAIL_API_KEY;if(!s)throw Error("AGENTMAIL_API_KEY not set");let l=await fetch("https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${s}`},body:JSON.stringify({to:r,subject:i,html:o,text:n})});if(!l.ok){let e=await l.text().catch(()=>l.statusText);throw Error(`Email API error ${l.status}: ${e}`)}}async function f(e,t){let r=e.config.url;if(!r)throw Error("Webhook URL not configured");let a=JSON.stringify({event:"alert.created",alert:{id:t.id,title:t.title,summary:t.summary,vendor_slug:t.vendor_slug,risk_level:t.risk_level,risk_category:t.risk_category,severity:t.severity,source_url:t.source_url,created_at:t.created_at},timestamp:new Date().toISOString()}),i={"Content-Type":"application/json"};if(e.config.secret){let t=new TextEncoder,r=t.encode(e.config.secret),o=t.encode(a),n=await crypto.subtle.importKey("raw",r,{name:"HMAC",hash:"SHA-256"},!1,["sign"]),s=Array.from(new Uint8Array(await crypto.subtle.sign("HMAC",n,o))).map(e=>e.toString(16).padStart(2,"0")).join("");i["X-CRR-Signature"]=`sha256=${s}`,i["X-CRR-Timestamp"]=new Date().toISOString()}let o=await fetch(r,{method:"POST",headers:i,body:a});if(!o.ok){let e=await o.text().catch(()=>o.statusText);throw Error(`Webhook error ${o.status}: ${e}`)}}async function y(e,t){let r=e.config.integration_key;if(!r)throw Error("PagerDuty integration key not configured");let a=t.severity??t.risk_level??"high",i={routing_key:r,event_action:"trigger",dedup_key:`crr-${t.org_id}-${t.vendor_slug}-${t.title.slice(0,50)}`.replace(/[^a-zA-Z0-9-]/g,"-"),payload:{summary:`[${t.vendor_slug.toUpperCase()}] ${t.title}`,severity:"critical"===a?"critical":"high"===a?"error":"warning",source:"Change Risk Radar",custom_details:{vendor:t.vendor_slug,category:t.risk_category,summary:t.summary,source_url:t.source_url,alert_id:t.id}},links:[{href:"https://change-risk-radar.vercel.app",text:"View in Change Risk Radar"},...t.source_url?[{href:t.source_url,text:"Source"}]:[]]},o=await fetch("https://events.pagerduty.com/v2/enqueue",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)});if(!o.ok){let e=await o.text().catch(()=>o.statusText);throw Error(`PagerDuty error ${o.status}: ${e}`)}}async function h(e){try{let t=await fetch(e,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:"✅ *Change Risk Radar* — Webhook connected successfully! You'll receive alerts here when risk changes are detected."})});if(t.ok||await t.text().then(e=>"ok"===e))return{ok:!0};let r=await t.text().catch(()=>t.statusText);return{ok:!1,error:`${t.status}: ${r}`}}catch(e){return{ok:!1,error:e instanceof Error?e.message:String(e)}}}async function m(e,t){let r=0,a=0,i=0;for(let e of t)for(let t of(await n(e)))"sent"===t.status?r++:"failed"===t.status?a++:i++;return{sent:r,failed:a,skipped:i}}}};