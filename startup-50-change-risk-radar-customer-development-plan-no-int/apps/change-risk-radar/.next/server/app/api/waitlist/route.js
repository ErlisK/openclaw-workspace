(()=>{var e={};e.id=2225,e.ids=[2225],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},18479:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>h,routeModule:()=>u,serverHooks:()=>g,workAsyncStorage:()=>x,workUnitAsyncStorage:()=>m});var s={};r.r(s),r.d(s,{POST:()=>c});var a=r(96559),o=r(48088),i=r(37719),n=r(32190),p=r(56621);let d=process.env.AGENTMAIL_API_KEY;async function l(e,t,r,s){if(d)try{await fetch("https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send",{method:"POST",headers:{Authorization:`Bearer ${d}`,"Content-Type":"application/json"},body:JSON.stringify({to:"scide-founder@agentmail.to",subject:`🎯 New waitlist signup: ${e}`,text:`New signup on Change Risk Radar!

Email: ${e}
Company: ${t||"—"}
Role: ${r||"—"}
Top concern: ${s||"—"}

Site: https://change-risk-radar.vercel.app
Dashboard: https://app.supabase.com/project/lpxhxmpzqjygsaawkrva`,html:`
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:20px">
            <h2 style="color:#635bff">🎯 New Waitlist Signup!</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Email</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${e}</strong></td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Company</td><td style="padding:8px;border-bottom:1px solid #eee">${t||"—"}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Role</td><td style="padding:8px;border-bottom:1px solid #eee">${r||"—"}</td></tr>
              <tr><td style="padding:8px;color:#666">Top concern</td><td style="padding:8px">${s||"—"}</td></tr>
            </table>
            <p style="margin-top:20px">
              <a href="https://change-risk-radar.vercel.app" style="color:#635bff">View site</a> \xb7
              <a href="https://app.supabase.com/project/lpxhxmpzqjygsaawkrva/editor" style="color:#635bff">View in Supabase</a>
            </p>
          </div>
        `})})}catch(e){console.error("Agentmail notification failed:",e)}}async function c(e){try{let{email:t,company:r,role:s,top_tool:a}=await e.json();if(!t)return n.NextResponse.json({error:"Email required"},{status:400});let{error:o}=await p.E2.from("crr_waitlist").upsert({email:t.toLowerCase().trim(),company:r,role:s,top_tool:a},{onConflict:"email"});if(o)return console.error("Waitlist insert error:",o),n.NextResponse.json({error:"Failed to join waitlist"},{status:500});return l(t,r,s,a),n.NextResponse.json({success:!0})}catch(e){return console.error(e),n.NextResponse.json({error:"Server error"},{status:500})}}let u=new a.AppRouteRouteModule({definition:{kind:o.RouteKind.APP_ROUTE,page:"/api/waitlist/route",pathname:"/api/waitlist",filename:"route",bundlePath:"app/api/waitlist/route"},resolvedPagePath:"/tmp/openclaw-workspace/startup-50-change-risk-radar-customer-development-plan-no-int/apps/change-risk-radar/src/app/api/waitlist/route.ts",nextConfigOutput:"",userland:s}),{workAsyncStorage:x,workUnitAsyncStorage:m,serverHooks:g}=u;function h(){return(0,i.patchFetch)({workAsyncStorage:x,workUnitAsyncStorage:m})}},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},56621:(e,t,r)=>{"use strict";r.d(t,{E2:()=>n,_8:()=>i});var s=r(73026);let a="https://lpxhxmpzqjygsaawkrva.supabase.co",o=process.env.SUPABASE_SERVICE_ROLE_KEY;function i(){return(0,s.UU)(a,o,{auth:{persistSession:!1}})}(0,s.UU)(a,"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxweGh4bXB6cWp5Z3NhYXdrcnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDA4NjMsImV4cCI6MjA5MDcxNjg2M30.MZhuBLuFx6tEyCgNYepmaD2HtkngjetiuKeBBnCA1UA");let n=i()},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},78335:()=>{},96487:()=>{}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[4447,3026,580],()=>r(18479));module.exports=s})();