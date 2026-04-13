(()=>{var e={};e.id=4095,e.ids=[4095],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},31556:(e,t,n)=>{"use strict";n.d(t,{$u:()=>_,Fb:()=>i,HW:()=>u,Sv:()=>r,V8:()=>l,Xg:()=>f,Yy:()=>p,Z2:()=>g,Zt:()=>m,hB:()=>c,hX:()=>b,hn:()=>h,iD:()=>y,jb:()=>s,mf:()=>k,pj:()=>o,qW:()=>d});var a=n(56621);async function i(e){let t=a.E2.from("crr_help_articles").select("id,slug,title,category,excerpt,tags,view_count,helpful_count,not_helpful_count,sort_order,updated_at").eq("is_published",!0).order("sort_order");e&&(t=t.eq("category",e));let{data:n}=await t;return n??[]}async function r(e){let{data:t}=await a.E2.from("crr_help_articles").select("*").eq("slug",e).eq("is_published",!0).single();return t&&a.E2.from("crr_help_articles").update({view_count:(t.view_count??0)+1}).eq("id",t.id),t??null}async function s(e){let t=e.toLowerCase().trim(),{data:n}=await a.E2.from("crr_help_articles").select("id,slug,title,category,excerpt,tags,sort_order,updated_at").eq("is_published",!0).or(`title.ilike.%${t}%,excerpt.ilike.%${t}%`).order("sort_order").limit(10);return n??[]}async function o(e,t){let{data:n}=await a.E2.from("crr_help_articles").select("id,helpful_count,not_helpful_count").eq("slug",e).single();n&&await a.E2.from("crr_help_articles").update(t?{helpful_count:(n.helpful_count??0)+1}:{not_helpful_count:(n.not_helpful_count??0)+1}).eq("id",n.id)}let c=[{id:"getting-started",label:"Getting Started",emoji:"\uD83D\uDE80"},{id:"connectors",label:"Connectors",emoji:"\uD83D\uDD0C"},{id:"alerts",label:"Alerts",emoji:"\uD83D\uDD14"},{id:"billing",label:"Billing",emoji:"\uD83D\uDCB3"},{id:"security",label:"Security",emoji:"\uD83D\uDD12"},{id:"api",label:"API",emoji:"⚡"}];async function l(){let{data:e}=await a.E2.from("crr_status_components").select("*").eq("is_active",!0).order("display_order");return e??[]}async function d(){let{data:e}=await a.E2.from("crr_status_incidents").select("*").not("status","eq","resolved").order("created_at",{ascending:!1});if(!e?.length)return[];let t=e.map(e=>e.id),{data:n}=await a.E2.from("crr_status_updates").select("*").in("incident_id",t).order("created_at",{ascending:!1});return e.map(e=>({...e,updates:(n??[]).filter(t=>t.incident_id===e.id)}))}async function u(e=30){let t=new Date(Date.now()-864e5*e).toISOString(),{data:n}=await a.E2.from("crr_status_incidents").select("*").gte("created_at",t).order("created_at",{ascending:!1}).limit(20);if(!n?.length)return[];let i=n.map(e=>e.id),{data:r}=await a.E2.from("crr_status_updates").select("*").in("incident_id",i).order("created_at",{ascending:!1});return n.map(e=>({...e,updates:(r??[]).filter(t=>t.incident_id===e.id)}))}async function p(e){for(let t of["major_outage","partial_outage","degraded_performance","maintenance","operational"])if(e.some(e=>e.status===t))return t;return"operational"}let m={operational:{label:"Operational",color:"text-green-700",bg:"bg-green-100"},degraded_performance:{label:"Degraded Performance",color:"text-yellow-700",bg:"bg-yellow-100"},partial_outage:{label:"Partial Outage",color:"text-orange-700",bg:"bg-orange-100"},major_outage:{label:"Major Outage",color:"text-red-700",bg:"bg-red-100"},maintenance:{label:"Under Maintenance",color:"text-blue-700",bg:"bg-blue-100"}},_={none:{label:"None",color:"text-gray-600"},minor:{label:"Minor",color:"text-yellow-600"},major:{label:"Major",color:"text-orange-600"},critical:{label:"Critical",color:"text-red-600"}};async function g(e){let t=`CRR-${Date.now().toString().slice(-6)}`,{data:n,error:i}=await a.E2.from("crr_support_tickets").insert({ticket_number:t,org_id:e.org_id??null,reporter_email:e.reporter_email,reporter_name:e.reporter_name??null,category:e.category??"general",priority:e.priority??"normal",subject:e.subject,description:e.description,tags:e.tags??[],status:"open"}).select("*").single();if(i)throw Error(i.message);return j(n),n}async function h(e){let{data:t}=await a.E2.from("crr_support_tickets").select("*").eq("id",e).single();if(!t)return null;let{data:n}=await a.E2.from("crr_ticket_messages").select("*").eq("ticket_id",e).order("created_at");return{...t,messages:n??[]}}async function f(e,t,n,i){await a.E2.from("crr_ticket_messages").insert({ticket_id:e,sender_email:t,sender_name:i?.senderName??null,body:n,is_internal:i?.isInternal??!1}),await a.E2.from("crr_support_tickets").update({updated_at:new Date().toISOString(),...i?.isInternal?{}:{first_response_at:new Date().toISOString()}}).eq("id",e).is("first_response_at",null)}async function y(e,t,n){await a.E2.from("crr_support_tickets").update({status:t,..."resolved"===t?{resolved_at:new Date().toISOString()}:{},...n?{assigned_to:n}:{},updated_at:new Date().toISOString()}).eq("id",e)}async function b(e){let{data:t}=await a.E2.from("crr_support_tickets").select("id,ticket_number,category,priority,status,subject,created_at,updated_at,resolved_at").eq("org_id",e).order("created_at",{ascending:!1});return t??[]}let w={"incident.investigating.email":{channel:"email",label:"New Incident — Investigating",description:"Initial email notification when an incident is first identified",subject:e=>`[Investigating] ${e.incident_title}`,getBody:e=>`We are currently investigating an issue with ${e.affected_components.join(", ")}.

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

— The Change Risk Radar Team`}};async function k(e,t,n,i){let r=function(e,t){let n=w[e];return n?{subject:"function"==typeof n.subject?n.subject(t):n.subject,body:n.getBody(t),channel:n.channel}:null}(t,i);if(!r)return;let{error:s}=await a.E2.from("crr_incident_comms").insert({incident_id:e,template_key:t,channel:r.channel,subject:r.subject??null,body:r.body,recipients:n,sent_at:"email"!==r.channel?new Date().toISOString():null,status:"draft"});if(!s&&"email"===r.channel&&n.length>0){for(let e of n)try{await fetch("https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.AGENTMAIL_API_KEY}`},body:JSON.stringify({to:e,subject:r.subject??`Status Update: ${i.incident_title}`,text:r.body})})}catch{}await a.E2.from("crr_incident_comms").update({status:"sent",sent_at:new Date().toISOString()}).eq("incident_id",e).eq("template_key",t)}}async function j(e){let t=`Hi ${e.reporter_name??"there"},

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

— The Change Risk Radar Support Team`;try{await fetch("https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.AGENTMAIL_API_KEY}`},body:JSON.stringify({to:e.reporter_email,subject:`[${e.ticket_number}] ${e.subject} — Support Received`,text:t})})}catch{}}},39125:(e,t,n)=>{"use strict";n.r(t),n.d(t,{patchFetch:()=>h,routeModule:()=>p,serverHooks:()=>g,workAsyncStorage:()=>m,workUnitAsyncStorage:()=>_});var a={};n.r(a),n.d(a,{GET:()=>d,POST:()=>u,dynamic:()=>l});var i=n(96559),r=n(48088),s=n(37719),o=n(32190),c=n(31556);let l="force-dynamic";async function d(e){let t=e.nextUrl.searchParams.get("slug"),n=e.nextUrl.searchParams.get("search"),a=e.nextUrl.searchParams.get("category")??void 0;if(t){let e=await (0,c.Sv)(t);return e?o.NextResponse.json({ok:!0,article:e}):o.NextResponse.json({error:"Not found"},{status:404})}if(n&&n.length>=2){let e=await (0,c.jb)(n);return o.NextResponse.json({ok:!0,results:e,query:n})}let i=await (0,c.Fb)(a),r={};for(let e of i)r[e.category]=r[e.category]??[],r[e.category].push(e);return o.NextResponse.json({ok:!0,categories:c.hB,articles:i,grouped:r,total:i.length})}async function u(e){let t=await e.json();return t.slug&&void 0!==t.helpful?(await (0,c.pj)(t.slug,t.helpful),o.NextResponse.json({ok:!0})):o.NextResponse.json({error:"slug and helpful required"},{status:400})}let p=new i.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/help/route",pathname:"/api/help",filename:"route",bundlePath:"app/api/help/route"},resolvedPagePath:"/tmp/openclaw-workspace/startup-50-change-risk-radar-customer-development-plan-no-int/apps/change-risk-radar/src/app/api/help/route.ts",nextConfigOutput:"",userland:a}),{workAsyncStorage:m,workUnitAsyncStorage:_,serverHooks:g}=p;function h(){return(0,s.patchFetch)({workAsyncStorage:m,workUnitAsyncStorage:_})}},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},56621:(e,t,n)=>{"use strict";n.d(t,{E2:()=>o,_8:()=>s});var a=n(73026);let i="https://lpxhxmpzqjygsaawkrva.supabase.co",r=process.env.SUPABASE_SERVICE_ROLE_KEY;function s(){return(0,a.UU)(i,r,{auth:{persistSession:!1}})}(0,a.UU)(i,"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxweGh4bXB6cWp5Z3NhYXdrcnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDA4NjMsImV4cCI6MjA5MDcxNjg2M30.MZhuBLuFx6tEyCgNYepmaD2HtkngjetiuKeBBnCA1UA");let o=s()},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},78335:()=>{},96487:()=>{}};var t=require("../../../webpack-runtime.js");t.C(e);var n=e=>t(t.s=e),a=t.X(0,[4447,3026,580],()=>n(39125));module.exports=a})();