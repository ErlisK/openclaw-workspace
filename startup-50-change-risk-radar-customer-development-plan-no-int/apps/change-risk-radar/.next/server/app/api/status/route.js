(()=>{var e={};e.id=144,e.ids=[144],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},31556:(e,t,a)=>{"use strict";a.d(t,{$u:()=>m,Fb:()=>i,HW:()=>u,Sv:()=>r,V8:()=>d,Xg:()=>h,Yy:()=>p,Z2:()=>g,Zt:()=>_,hB:()=>c,hX:()=>b,hn:()=>f,iD:()=>y,jb:()=>s,mf:()=>v,pj:()=>o,qW:()=>l});var n=a(56621);async function i(e){let t=n.E2.from("crr_help_articles").select("id,slug,title,category,excerpt,tags,view_count,helpful_count,not_helpful_count,sort_order,updated_at").eq("is_published",!0).order("sort_order");e&&(t=t.eq("category",e));let{data:a}=await t;return a??[]}async function r(e){let{data:t}=await n.E2.from("crr_help_articles").select("*").eq("slug",e).eq("is_published",!0).single();return t&&n.E2.from("crr_help_articles").update({view_count:(t.view_count??0)+1}).eq("id",t.id),t??null}async function s(e){let t=e.toLowerCase().trim(),{data:a}=await n.E2.from("crr_help_articles").select("id,slug,title,category,excerpt,tags,sort_order,updated_at").eq("is_published",!0).or(`title.ilike.%${t}%,excerpt.ilike.%${t}%`).order("sort_order").limit(10);return a??[]}async function o(e,t){let{data:a}=await n.E2.from("crr_help_articles").select("id,helpful_count,not_helpful_count").eq("slug",e).single();a&&await n.E2.from("crr_help_articles").update(t?{helpful_count:(a.helpful_count??0)+1}:{not_helpful_count:(a.not_helpful_count??0)+1}).eq("id",a.id)}let c=[{id:"getting-started",label:"Getting Started",emoji:"\uD83D\uDE80"},{id:"connectors",label:"Connectors",emoji:"\uD83D\uDD0C"},{id:"alerts",label:"Alerts",emoji:"\uD83D\uDD14"},{id:"billing",label:"Billing",emoji:"\uD83D\uDCB3"},{id:"security",label:"Security",emoji:"\uD83D\uDD12"},{id:"api",label:"API",emoji:"⚡"}];async function d(){let{data:e}=await n.E2.from("crr_status_components").select("*").eq("is_active",!0).order("display_order");return e??[]}async function l(){let{data:e}=await n.E2.from("crr_status_incidents").select("*").not("status","eq","resolved").order("created_at",{ascending:!1});if(!e?.length)return[];let t=e.map(e=>e.id),{data:a}=await n.E2.from("crr_status_updates").select("*").in("incident_id",t).order("created_at",{ascending:!1});return e.map(e=>({...e,updates:(a??[]).filter(t=>t.incident_id===e.id)}))}async function u(e=30){let t=new Date(Date.now()-864e5*e).toISOString(),{data:a}=await n.E2.from("crr_status_incidents").select("*").gte("created_at",t).order("created_at",{ascending:!1}).limit(20);if(!a?.length)return[];let i=a.map(e=>e.id),{data:r}=await n.E2.from("crr_status_updates").select("*").in("incident_id",i).order("created_at",{ascending:!1});return a.map(e=>({...e,updates:(r??[]).filter(t=>t.incident_id===e.id)}))}async function p(e){for(let t of["major_outage","partial_outage","degraded_performance","maintenance","operational"])if(e.some(e=>e.status===t))return t;return"operational"}let _={operational:{label:"Operational",color:"text-green-700",bg:"bg-green-100"},degraded_performance:{label:"Degraded Performance",color:"text-yellow-700",bg:"bg-yellow-100"},partial_outage:{label:"Partial Outage",color:"text-orange-700",bg:"bg-orange-100"},major_outage:{label:"Major Outage",color:"text-red-700",bg:"bg-red-100"},maintenance:{label:"Under Maintenance",color:"text-blue-700",bg:"bg-blue-100"}},m={none:{label:"None",color:"text-gray-600"},minor:{label:"Minor",color:"text-yellow-600"},major:{label:"Major",color:"text-orange-600"},critical:{label:"Critical",color:"text-red-600"}};async function g(e){let t=`CRR-${Date.now().toString().slice(-6)}`,{data:a,error:i}=await n.E2.from("crr_support_tickets").insert({ticket_number:t,org_id:e.org_id??null,reporter_email:e.reporter_email,reporter_name:e.reporter_name??null,category:e.category??"general",priority:e.priority??"normal",subject:e.subject,description:e.description,tags:e.tags??[],status:"open"}).select("*").single();if(i)throw Error(i.message);return k(a),a}async function f(e){let{data:t}=await n.E2.from("crr_support_tickets").select("*").eq("id",e).single();if(!t)return null;let{data:a}=await n.E2.from("crr_ticket_messages").select("*").eq("ticket_id",e).order("created_at");return{...t,messages:a??[]}}async function h(e,t,a,i){await n.E2.from("crr_ticket_messages").insert({ticket_id:e,sender_email:t,sender_name:i?.senderName??null,body:a,is_internal:i?.isInternal??!1}),await n.E2.from("crr_support_tickets").update({updated_at:new Date().toISOString(),...i?.isInternal?{}:{first_response_at:new Date().toISOString()}}).eq("id",e).is("first_response_at",null)}async function y(e,t,a){await n.E2.from("crr_support_tickets").update({status:t,..."resolved"===t?{resolved_at:new Date().toISOString()}:{},...a?{assigned_to:a}:{},updated_at:new Date().toISOString()}).eq("id",e)}async function b(e){let{data:t}=await n.E2.from("crr_support_tickets").select("id,ticket_number,category,priority,status,subject,created_at,updated_at,resolved_at").eq("org_id",e).order("created_at",{ascending:!1});return t??[]}let w={"incident.investigating.email":{channel:"email",label:"New Incident — Investigating",description:"Initial email notification when an incident is first identified",subject:e=>`[Investigating] ${e.incident_title}`,getBody:e=>`We are currently investigating an issue with ${e.affected_components.join(", ")}.

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

— The Change Risk Radar Team`}};async function v(e,t,a,i){let r=function(e,t){let a=w[e];return a?{subject:"function"==typeof a.subject?a.subject(t):a.subject,body:a.getBody(t),channel:a.channel}:null}(t,i);if(!r)return;let{error:s}=await n.E2.from("crr_incident_comms").insert({incident_id:e,template_key:t,channel:r.channel,subject:r.subject??null,body:r.body,recipients:a,sent_at:"email"!==r.channel?new Date().toISOString():null,status:"draft"});if(!s&&"email"===r.channel&&a.length>0){for(let e of a)try{await fetch("https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.AGENTMAIL_API_KEY}`},body:JSON.stringify({to:e,subject:r.subject??`Status Update: ${i.incident_title}`,text:r.body})})}catch{}await n.E2.from("crr_incident_comms").update({status:"sent",sent_at:new Date().toISOString()}).eq("incident_id",e).eq("template_key",t)}}async function k(e){let t=`Hi ${e.reporter_name??"there"},

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

— The Change Risk Radar Support Team`;try{await fetch("https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.AGENTMAIL_API_KEY}`},body:JSON.stringify({to:e.reporter_email,subject:`[${e.ticket_number}] ${e.subject} — Support Received`,text:t})})}catch{}}},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},56621:(e,t,a)=>{"use strict";a.d(t,{E2:()=>o,_8:()=>s});var n=a(73026);let i="https://lpxhxmpzqjygsaawkrva.supabase.co",r=process.env.SUPABASE_SERVICE_ROLE_KEY;function s(){return(0,n.UU)(i,r,{auth:{persistSession:!1}})}(0,n.UU)(i,"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxweGh4bXB6cWp5Z3NhYXdrcnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDA4NjMsImV4cCI6MjA5MDcxNjg2M30.MZhuBLuFx6tEyCgNYepmaD2HtkngjetiuKeBBnCA1UA");let o=s()},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},78335:()=>{},82727:(e,t,a)=>{"use strict";a.r(t),a.d(t,{patchFetch:()=>h,routeModule:()=>_,serverHooks:()=>f,workAsyncStorage:()=>m,workUnitAsyncStorage:()=>g});var n={};a.r(n),a.d(n,{GET:()=>u,POST:()=>p,dynamic:()=>l});var i=a(96559),r=a(48088),s=a(37719),o=a(32190),c=a(56621),d=a(31556);let l="force-dynamic";async function u(e){let t="1"===e.nextUrl.searchParams.get("history"),a=e.nextUrl.searchParams.get("incident_id");if(a){let{data:e}=await c.E2.from("crr_status_incidents").select("*").eq("id",a).single(),{data:t}=await c.E2.from("crr_status_updates").select("*").eq("incident_id",a).order("created_at",{ascending:!1});return o.NextResponse.json({ok:!0,incident:{...e,updates:t??[]}})}let[n,i]=await Promise.all([(0,d.V8)(),(0,d.qW)()]),r=await (0,d.Yy)(n),s=d.Zt[r],l={ok:!0,overall_status:r,overall_label:s.label,components:n.map(e=>({...e,label:d.Zt[e.status].label})),active_incidents:i,last_updated:new Date().toISOString()};return t&&(l.recent_incidents=await (0,d.HW)(30)),o.NextResponse.json(l)}async function p(e){if((e.headers.get("x-portal-secret")??e.nextUrl.searchParams.get("secret"))!==(process.env.PORTAL_SECRET??"crr-portal-2025"))return o.NextResponse.json({error:"Unauthorized"},{status:401});let t=await e.json(),a=t.action??"upsert_incident";if("update_component"===a){if(!t.component_slug||!t.component_status)return o.NextResponse.json({error:"component_slug and component_status required"},{status:400});let{error:e}=await c.E2.from("crr_status_components").update({status:t.component_status,updated_at:new Date().toISOString()}).eq("slug",t.component_slug);return e?o.NextResponse.json({error:e.message},{status:500}):o.NextResponse.json({ok:!0,updated:t.component_slug})}if("add_update"===a&&t.incident_id){let e=t.status??"update",a=t.body_text??"";if(await c.E2.from("crr_status_updates").insert({incident_id:t.incident_id,status:e,body:a,created_by:"support-team"}),await c.E2.from("crr_status_incidents").update({status:e,body:a,updated_at:new Date().toISOString(),...t.resolved?{resolved_at:new Date().toISOString(),status:"resolved"}:{}}).eq("id",t.incident_id),t.resolved&&t.affected_components?.length)for(let e of t.affected_components)await c.E2.from("crr_status_components").update({status:"operational",updated_at:new Date().toISOString()}).eq("slug",e);if(t.send_comms&&t.comms_template&&t.comms_recipients?.length){let{data:e}=await c.E2.from("crr_status_incidents").select("*").eq("id",t.incident_id).single();if(e){let n={incident_title:e.title,incident_status:e.status,impact:e.impact,affected_components:e.affected_components??[],body:a,started_at:e.created_at,resolved_at:t.resolved?new Date().toISOString():void 0,incident_url:"https://change-risk-radar.vercel.app/status"};await (0,d.mf)(t.incident_id,t.comms_template,t.comms_recipients,n)}}return o.NextResponse.json({ok:!0,action:"update_added"})}if(!t.title)return o.NextResponse.json({error:"title required"},{status:400});let{data:n,error:i}=await c.E2.from("crr_status_incidents").insert({title:t.title,status:t.status??"investigating",impact:t.impact??"minor",affected_components:t.affected_components??[],body:t.body_text??"",created_by:"support-team",scheduled_for:t.scheduled_for??null,scheduled_until:t.scheduled_until??null}).select("*").single();if(i||!n)return o.NextResponse.json({error:i?.message??"Failed to create incident"},{status:500});if(t.affected_components?.length){let e="critical"===t.impact?"major_outage":"major"===t.impact?"partial_outage":t.scheduled_for?"maintenance":"degraded_performance";for(let a of t.affected_components)await c.E2.from("crr_status_components").update({status:e,updated_at:new Date().toISOString()}).eq("slug",a)}if(await c.E2.from("crr_status_updates").insert({incident_id:n.id,status:t.status??"investigating",body:t.body_text??"",created_by:"support-team"}),t.send_comms&&t.comms_recipients?.length){let e=t.comms_template??`incident.${n.status}.email`,a={incident_title:n.title,incident_status:n.status,impact:n.impact,affected_components:n.affected_components??[],body:t.body_text??"",started_at:n.created_at,incident_url:"https://change-risk-radar.vercel.app/status"};await (0,d.mf)(n.id,e,t.comms_recipients,a)}return o.NextResponse.json({ok:!0,incident:n})}let _=new i.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/status/route",pathname:"/api/status",filename:"route",bundlePath:"app/api/status/route"},resolvedPagePath:"/tmp/openclaw-workspace/startup-50-change-risk-radar-customer-development-plan-no-int/apps/change-risk-radar/src/app/api/status/route.ts",nextConfigOutput:"",userland:n}),{workAsyncStorage:m,workUnitAsyncStorage:g,serverHooks:f}=_;function h(){return(0,s.patchFetch)({workAsyncStorage:m,workUnitAsyncStorage:g})}},96487:()=>{}};var t=require("../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),n=t.X(0,[4447,3026,580],()=>a(82727));module.exports=n})();