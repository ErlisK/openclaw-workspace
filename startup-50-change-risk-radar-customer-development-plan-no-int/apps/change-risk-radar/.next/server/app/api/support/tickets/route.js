(()=>{var e={};e.id=5409,e.ids=[5409],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},31556:(e,t,i)=>{"use strict";i.d(t,{$u:()=>_,Fb:()=>r,HW:()=>u,Sv:()=>n,V8:()=>l,Xg:()=>h,Yy:()=>p,Z2:()=>g,Zt:()=>m,hB:()=>c,hX:()=>b,hn:()=>f,iD:()=>y,jb:()=>s,mf:()=>k,pj:()=>o,qW:()=>d});var a=i(56621);async function r(e){let t=a.E2.from("crr_help_articles").select("id,slug,title,category,excerpt,tags,view_count,helpful_count,not_helpful_count,sort_order,updated_at").eq("is_published",!0).order("sort_order");e&&(t=t.eq("category",e));let{data:i}=await t;return i??[]}async function n(e){let{data:t}=await a.E2.from("crr_help_articles").select("*").eq("slug",e).eq("is_published",!0).single();return t&&a.E2.from("crr_help_articles").update({view_count:(t.view_count??0)+1}).eq("id",t.id),t??null}async function s(e){let t=e.toLowerCase().trim(),{data:i}=await a.E2.from("crr_help_articles").select("id,slug,title,category,excerpt,tags,sort_order,updated_at").eq("is_published",!0).or(`title.ilike.%${t}%,excerpt.ilike.%${t}%`).order("sort_order").limit(10);return i??[]}async function o(e,t){let{data:i}=await a.E2.from("crr_help_articles").select("id,helpful_count,not_helpful_count").eq("slug",e).single();i&&await a.E2.from("crr_help_articles").update(t?{helpful_count:(i.helpful_count??0)+1}:{not_helpful_count:(i.not_helpful_count??0)+1}).eq("id",i.id)}let c=[{id:"getting-started",label:"Getting Started",emoji:"\uD83D\uDE80"},{id:"connectors",label:"Connectors",emoji:"\uD83D\uDD0C"},{id:"alerts",label:"Alerts",emoji:"\uD83D\uDD14"},{id:"billing",label:"Billing",emoji:"\uD83D\uDCB3"},{id:"security",label:"Security",emoji:"\uD83D\uDD12"},{id:"api",label:"API",emoji:"⚡"}];async function l(){let{data:e}=await a.E2.from("crr_status_components").select("*").eq("is_active",!0).order("display_order");return e??[]}async function d(){let{data:e}=await a.E2.from("crr_status_incidents").select("*").not("status","eq","resolved").order("created_at",{ascending:!1});if(!e?.length)return[];let t=e.map(e=>e.id),{data:i}=await a.E2.from("crr_status_updates").select("*").in("incident_id",t).order("created_at",{ascending:!1});return e.map(e=>({...e,updates:(i??[]).filter(t=>t.incident_id===e.id)}))}async function u(e=30){let t=new Date(Date.now()-864e5*e).toISOString(),{data:i}=await a.E2.from("crr_status_incidents").select("*").gte("created_at",t).order("created_at",{ascending:!1}).limit(20);if(!i?.length)return[];let r=i.map(e=>e.id),{data:n}=await a.E2.from("crr_status_updates").select("*").in("incident_id",r).order("created_at",{ascending:!1});return i.map(e=>({...e,updates:(n??[]).filter(t=>t.incident_id===e.id)}))}async function p(e){for(let t of["major_outage","partial_outage","degraded_performance","maintenance","operational"])if(e.some(e=>e.status===t))return t;return"operational"}let m={operational:{label:"Operational",color:"text-green-700",bg:"bg-green-100"},degraded_performance:{label:"Degraded Performance",color:"text-yellow-700",bg:"bg-yellow-100"},partial_outage:{label:"Partial Outage",color:"text-orange-700",bg:"bg-orange-100"},major_outage:{label:"Major Outage",color:"text-red-700",bg:"bg-red-100"},maintenance:{label:"Under Maintenance",color:"text-blue-700",bg:"bg-blue-100"}},_={none:{label:"None",color:"text-gray-600"},minor:{label:"Minor",color:"text-yellow-600"},major:{label:"Major",color:"text-orange-600"},critical:{label:"Critical",color:"text-red-600"}};async function g(e){let t=`CRR-${Date.now().toString().slice(-6)}`,{data:i,error:r}=await a.E2.from("crr_support_tickets").insert({ticket_number:t,org_id:e.org_id??null,reporter_email:e.reporter_email,reporter_name:e.reporter_name??null,category:e.category??"general",priority:e.priority??"normal",subject:e.subject,description:e.description,tags:e.tags??[],status:"open"}).select("*").single();if(r)throw Error(r.message);return j(i),i}async function f(e){let{data:t}=await a.E2.from("crr_support_tickets").select("*").eq("id",e).single();if(!t)return null;let{data:i}=await a.E2.from("crr_ticket_messages").select("*").eq("ticket_id",e).order("created_at");return{...t,messages:i??[]}}async function h(e,t,i,r){await a.E2.from("crr_ticket_messages").insert({ticket_id:e,sender_email:t,sender_name:r?.senderName??null,body:i,is_internal:r?.isInternal??!1}),await a.E2.from("crr_support_tickets").update({updated_at:new Date().toISOString(),...r?.isInternal?{}:{first_response_at:new Date().toISOString()}}).eq("id",e).is("first_response_at",null)}async function y(e,t,i){await a.E2.from("crr_support_tickets").update({status:t,..."resolved"===t?{resolved_at:new Date().toISOString()}:{},...i?{assigned_to:i}:{},updated_at:new Date().toISOString()}).eq("id",e)}async function b(e){let{data:t}=await a.E2.from("crr_support_tickets").select("id,ticket_number,category,priority,status,subject,created_at,updated_at,resolved_at").eq("org_id",e).order("created_at",{ascending:!1});return t??[]}let w={"incident.investigating.email":{channel:"email",label:"New Incident — Investigating",description:"Initial email notification when an incident is first identified",subject:e=>`[Investigating] ${e.incident_title}`,getBody:e=>`We are currently investigating an issue with ${e.affected_components.join(", ")}.

**Status:** Investigating
**Impact:** ${e.impact.charAt(0).toUpperCase()+e.impact.slice(1)}

${e.body}

We will provide an update within 30 minutes. Track real-time status at: ${e.incident_url}

— The Change Risk Radar Team`},"incident.identified.email":{channel:"email",label:"Incident Identified",description:"Email when root cause has been identified",subject:e=>`[Identified] ${e.incident_title}`,getBody:e=>`We have identified the root cause of the incident affecting ${e.affected_components.join(", ")}.

**Status:** Root Cause Identified
**Impact:** ${e.impact.charAt(0).toUpperCase()+e.impact.slice(1)}

${e.body}

Our team is working on a fix. We expect to provide a further update by ${e.next_update??"within 1 hour"}.

Track live status: ${e.incident_url}

— The Change Risk Radar Team`},"incident.resolved.email":{channel:"email",label:"Incident Resolved",description:"Resolution email with summary and postmortem promise",subject:e=>`[Resolved] ${e.incident_title}`,getBody:e=>`The incident affecting ${e.affected_components.join(", ")} has been resolved.

**Resolved at:** ${e.resolved_at??new Date().toISOString()}
**Duration:** ${e.started_at?Math.round((Date.now()-new Date(e.started_at).getTime())/6e4)+" minutes":"—"}

${e.body}

All systems are now operational. A postmortem will be published within 5 business days.

We apologize for any disruption this caused. If you have questions, reply to this email or open a support ticket.

Track status history: ${e.incident_url}

— The Change Risk Radar Team`},"incident.investigating.slack":{channel:"slack",label:"New Incident — Slack",description:"Slack message for new incident notification",getBody:e=>`:red_circle: *Incident: ${e.incident_title}*

*Status:* Investigating
*Impact:* ${e.impact}
*Affected:* ${e.affected_components.join(", ")}

${e.body}

Track status: ${e.incident_url}`},"incident.resolved.slack":{channel:"slack",label:"Incident Resolved — Slack",description:"Slack message when incident is resolved",getBody:e=>`:white_check_mark: *Resolved: ${e.incident_title}*

All systems are now operational. Duration: ${e.started_at?Math.round((Date.now()-new Date(e.started_at).getTime())/6e4)+" min":"—"}

${e.body}

Full details: ${e.incident_url}`},"incident.monitoring.slack":{channel:"slack",label:"Monitoring Fix — Slack",description:"Slack message when fix is deployed and being monitored",getBody:e=>`:eyes: *Monitoring: ${e.incident_title}*

*Status:* Fix deployed, monitoring
*Affected:* ${e.affected_components.join(", ")}

${e.body}

Next update: ${e.next_update??"30 minutes"} | Status: ${e.incident_url}`},"incident.update.in_app":{channel:"in_app",label:"In-App Status Banner",description:"Banner text for in-app incident notification",getBody:e=>`⚠️ We are experiencing issues with ${e.affected_components.join(", ")}. ${e.body} — Track status at /status`},"maintenance.scheduled.email":{channel:"email",label:"Scheduled Maintenance Notice",description:"Email sent in advance of planned maintenance window",subject:e=>`[Scheduled Maintenance] ${e.incident_title}`,getBody:e=>`We have scheduled maintenance that may affect ${e.affected_components.join(", ")}.

**Scheduled:** ${e.started_at}
**Duration:** Until approximately ${e.next_update??"completion"}
**Impact:** Possible brief interruption to ${e.affected_components.join(", ")}

${e.body}

No action is required on your part. We will notify you when maintenance is complete.

Track status: ${e.incident_url}

— The Change Risk Radar Team`}};async function k(e,t,i,r){let n=function(e,t){let i=w[e];return i?{subject:"function"==typeof i.subject?i.subject(t):i.subject,body:i.getBody(t),channel:i.channel}:null}(t,r);if(!n)return;let{error:s}=await a.E2.from("crr_incident_comms").insert({incident_id:e,template_key:t,channel:n.channel,subject:n.subject??null,body:n.body,recipients:i,sent_at:"email"!==n.channel?new Date().toISOString():null,status:"draft"});if(!s&&"email"===n.channel&&i.length>0){for(let e of i)try{await fetch("https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.AGENTMAIL_API_KEY}`},body:JSON.stringify({to:e,subject:n.subject??`Status Update: ${r.incident_title}`,text:n.body})})}catch{}await a.E2.from("crr_incident_comms").update({status:"sent",sent_at:new Date().toISOString()}).eq("incident_id",e).eq("template_key",t)}}async function j(e){let t=`Hi ${e.reporter_name??"there"},

Thank you for contacting Change Risk Radar support.

Your ticket has been received:

  Ticket #: ${e.ticket_number}
  Subject:  ${e.subject}
  Priority: ${e.priority.charAt(0).toUpperCase()+e.priority.slice(1)}

Our team will respond within:
- Urgent: 1 business hour
- High: 4 business hours
- Normal/Low: 1 business day

You can check your ticket status at:
https://change-risk-radar.vercel.app/support/${e.id}

— The Change Risk Radar Support Team`;try{await fetch("https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.AGENTMAIL_API_KEY}`},body:JSON.stringify({to:e.reporter_email,subject:`[${e.ticket_number}] ${e.subject} — Support Received`,text:t})})}catch{}}},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},56621:(e,t,i)=>{"use strict";i.d(t,{E2:()=>o,_8:()=>s});var a=i(73026);let r="https://lpxhxmpzqjygsaawkrva.supabase.co",n=process.env.SUPABASE_SERVICE_ROLE_KEY;function s(){return(0,a.UU)(r,n,{auth:{persistSession:!1}})}(0,a.UU)(r,"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxweGh4bXB6cWp5Z3NhYXdrcnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDA4NjMsImV4cCI6MjA5MDcxNjg2M30.MZhuBLuFx6tEyCgNYepmaD2HtkngjetiuKeBBnCA1UA");let o=s()},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},67753:(e,t,i)=>{"use strict";i.r(t),i.d(t,{patchFetch:()=>y,routeModule:()=>_,serverHooks:()=>h,workAsyncStorage:()=>g,workUnitAsyncStorage:()=>f});var a={};i.r(a),i.d(a,{GET:()=>p,POST:()=>m,dynamic:()=>d});var r=i(96559),n=i(48088),s=i(37719),o=i(32190),c=i(56621),l=i(31556);let d="force-dynamic";async function u(e){let t=e.headers.get("x-org-token")??e.nextUrl.searchParams.get("token");if(!t)return null;let{data:i}=await c.E2.from("crr_orgs").select("id, slug").eq("magic_token",t).single();return i}async function p(e){let t=await u(e),i=(e.headers.get("x-portal-secret")??e.nextUrl.searchParams.get("secret"))===(process.env.PORTAL_SECRET??"crr-portal-2025");if(!t&&!i)return o.NextResponse.json({error:"Unauthorized"},{status:401});if(i){let t=e.nextUrl.searchParams.get("status"),i=e.nextUrl.searchParams.get("priority"),a=parseInt(e.nextUrl.searchParams.get("limit")??"50",10),r=c.E2.from("crr_support_tickets").select("id,ticket_number,org_id,reporter_email,reporter_name,category,priority,status,subject,assigned_to,created_at,updated_at,resolved_at").order("created_at",{ascending:!1}).limit(a);t&&(r=r.eq("status",t)),i&&(r=r.eq("priority",i));let{data:n,error:s}=await r;if(s)return o.NextResponse.json({error:s.message},{status:500});let{data:l}=await c.E2.from("crr_support_tickets").select("status, priority"),d={open:0,in_progress:0,resolved:0,urgent:0};for(let e of l??[])"open"===e.status&&d.open++,"in_progress"===e.status&&d.in_progress++,"resolved"===e.status&&d.resolved++,"urgent"===e.priority&&d.urgent++;return o.NextResponse.json({ok:!0,tickets:n??[],counts:d})}let a=await (0,l.hX)(t.id);return o.NextResponse.json({ok:!0,tickets:a})}async function m(e){let t=await e.json();if(!t.reporter_email||!t.subject||!t.description)return o.NextResponse.json({error:"reporter_email, subject, and description are required"},{status:400});if(t.token){let{data:e}=await c.E2.from("crr_orgs").select("id").eq("magic_token",t.token).single();e&&(t.org_id=e.id)}try{let e=await (0,l.Z2)(t);return o.NextResponse.json({ok:!0,ticket:e},{status:201})}catch(e){return o.NextResponse.json({error:e.message},{status:500})}}let _=new r.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/support/tickets/route",pathname:"/api/support/tickets",filename:"route",bundlePath:"app/api/support/tickets/route"},resolvedPagePath:"/tmp/openclaw-workspace/startup-50-change-risk-radar-customer-development-plan-no-int/apps/change-risk-radar/src/app/api/support/tickets/route.ts",nextConfigOutput:"",userland:a}),{workAsyncStorage:g,workUnitAsyncStorage:f,serverHooks:h}=_;function y(){return(0,s.patchFetch)({workAsyncStorage:g,workUnitAsyncStorage:f})}},78335:()=>{},96487:()=>{}};var t=require("../../../../webpack-runtime.js");t.C(e);var i=e=>t(t.s=e),a=t.X(0,[4447,3026,580],()=>i(67753));module.exports=a})();