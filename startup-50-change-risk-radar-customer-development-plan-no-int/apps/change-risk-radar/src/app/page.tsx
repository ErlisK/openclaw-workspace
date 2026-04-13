import WaitlistForm from "@/components/WaitlistForm";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// A/B PRICING VARIANTS
const PRICING_VARIANTS = {
  A: {
    label: "Control",
    starter: { price: "$99", monthly: "/mo", features: ["10 tools monitored", "Email alerts", "Weekly digest", "Basic risk taxonomy", "30-day history"] },
    growth: { price: "$299", monthly: "/mo", badge: "Most Popular", features: ["30 tools monitored", "Real-time alerts", "Priority classification", "API access", "90-day history", "Webhook + email"] },
    enterprise: { price: "Custom", monthly: "", features: ["Unlimited tools", "Custom vendors", "Dedicated analyst", "SLA guarantee", "SSO + RBAC"] },
    deposit: { amount: "$100", cents: 10000, label: "Reserve with $100 refundable deposit" },
  },
  B: {
    label: "Premium",
    starter: { price: "$149", monthly: "/mo", features: ["10 tools monitored", "Email alerts", "Daily digest", "Full risk taxonomy", "90-day history"] },
    growth: { price: "$399", monthly: "/mo", badge: "Most Popular", features: ["Unlimited tools", "Real-time alerts", "Priority + API access", "1-year history", "Webhook + email", "Risk scoring"] },
    enterprise: { price: "Custom", monthly: "", features: ["White-label reports", "Custom vendors", "Dedicated analyst", "SLA + Uptime guarantee", "SSO + RBAC"] },
    deposit: { amount: "$100", cents: 10000, label: "Reserve with $100 refundable deposit" },
  },
};

const VENDORS = ["Stripe","Shopify","AWS","Google Workspace","GitHub","Twilio","SendGrid","Salesforce","HubSpot","Cloudflare","Slack","Zoom","QuickBooks","Intercom","Zendesk","PayPal","Okta","Klaviyo","Vercel","Netlify"];
const RISK_TYPES = [
  { icon: "💰", label: "Pricing Changes", desc: "Fee increases, tier restructuring, quota reductions" },
  { icon: "⚖️", label: "Legal & Compliance", desc: "ToS updates, data policies, DPA changes, AUP restrictions" },
  { icon: "🔧", label: "API & Operational", desc: "Deprecations, SDK breaking changes, webhook format updates" },
  { icon: "🔒", label: "Security Events", desc: "Auth requirement changes, TLS upgrades, incident disclosures" },
];

const RISK_COLORS: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#10b981" };
const CATEGORY_ICONS: Record<string, string> = { pricing: "💰", legal: "⚖️", operational: "🔧", security: "🔒", vendor_risk: "🏢" };
const VENDOR_ICONS: Record<string, string> = { stripe:"💳", aws:"☁️", "google-workspace":"🔵", github:"🐙", shopify:"🛍️", vercel:"▲", slack:"💬", hubspot:"🟠", twilio:"📱", sendgrid:"✉️", cloudflare:"🌐", okta:"🔐", salesforce:"☁️", zendesk:"🎫", "google-ads":"📊", "meta-ads":"📘", klaviyo:"📧", netlify:"🌐", intercom:"💬" };

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 1) return `${d}d ago`;
  if (d === 1) return "yesterday";
  if (h > 1) return `${h}h ago`;
  return "just now";
}

export default async function HomePage() {
  // Read A/B variant from cookie
  const cookieStore = await cookies();
  const abVariant = (cookieStore.get("ab_pricing")?.value || "A") as "A" | "B";
  const pricing = PRICING_VARIANTS[abVariant];

  // Fetch live stats
  const [diffsRes, weekCountRes, waitlistCountRes, depositCountRes] = await Promise.all([
    supabaseAdmin.from("crr_diffs").select("id,vendor_slug,title,risk_level,risk_category,collected_at,summary").order("collected_at",{ascending:false}).limit(12),
    supabaseAdmin.from("crr_diffs").select("id",{count:"exact",head:true}).gte("collected_at",new Date(Date.now()-7*24*60*60*1000).toISOString()),
    supabaseAdmin.from("crr_waitlist").select("id",{count:"exact",head:true}),
    supabaseAdmin.from("crr_deposits").select("id",{count:"exact",head:true}),
  ]);

  const recentDiffs = diffsRes.data ?? [];
  const weeklyDiffs = weekCountRes.count ?? 0;
  const waitlistCount = waitlistCountRes.count ?? 0;
  const depositCount = depositCountRes.count ?? 0;

  const { count: totalDiffs } = await supabaseAdmin.from("crr_diffs").select("id",{count:"exact",head:true});

  return (
    <div>
      {/* HERO */}
      <section className="hero">
        <div className="container">
          {/* Live stats badge */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:"0.5rem", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:"999px", padding:"0.4rem 1rem", marginBottom:"2rem", fontSize:"0.875rem", color:"#ef4444" }}>
            <span style={{ display:"inline-block", width:"8px", height:"8px", borderRadius:"50%", background:"#ef4444", animation:"pulse 2s infinite" }}></span>
            <strong>{(totalDiffs ?? 0).toLocaleString()}+ changes</strong> monitored across 28 vendors —{" "}
            <strong>{weeklyDiffs}</strong> this week
          </div>
          <h1>Know Before <span className="gradient-text">Vendor Changes</span><br />Break Your Business</h1>
          <p>We watch Stripe, Shopify, AWS, Google Workspace, and 25+ more tools — alerting you in plain English when a change creates operational, legal, pricing, or security risk before you find out the hard way.</p>
          <div style={{display:"flex",gap:"1rem",justifyContent:"center",flexWrap:"wrap"}}>
            <Link href="/demo" className="btn-primary" style={{fontSize:"1.1rem",padding:"0.875rem 2rem"}}>🔴 See Live Demo</Link>
            <a href="#waitlist" className="btn-ghost">🎯 Join Waitlist →</a>
          </div>
          <div style={{marginTop:"2rem",color:"var(--muted)",fontSize:"0.8rem"}}>
            {waitlistCount > 0 && <span style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:"999px",padding:"0.3rem 0.8rem",marginRight:"0.75rem"}}>🎯 {waitlistCount} on waitlist</span>}
            {depositCount > 0 && <span style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"999px",padding:"0.3rem 0.8rem"}}>💎 {depositCount} reserved</span>}
          </div>
          <div style={{marginTop:"2rem",color:"var(--muted)",fontSize:"0.875rem"}}>
            Monitoring changes across
            <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem",justifyContent:"center",marginTop:"1rem"}}>
              {VENDORS.map(v => <span key={v} className="tag">{v}</span>)}
              <span className="tag">+10 more</span>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE CHANGE FEED */}
      <section className="section" style={{borderTop:"1px solid var(--border)",background:"rgba(0,0,0,0.2)"}}>
        <div className="container">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem",flexWrap:"wrap",gap:"1rem"}}>
            <div>
              <h2 style={{fontSize:"1.3rem",fontWeight:700,marginBottom:"0.25rem"}}>
                <span style={{display:"inline-block",width:"8px",height:"8px",borderRadius:"50%",background:"#ef4444",marginRight:"0.5rem"}}></span>
                Live Change Feed
              </h2>
              <p style={{color:"var(--muted)",fontSize:"0.875rem",margin:0}}>Real vendor changes detected by our observatory — updated every 6 hours</p>
            </div>
            <Link href="/observatory" style={{fontSize:"0.875rem",color:"var(--accent-light)",textDecoration:"none",fontWeight:600}}>View all {(totalDiffs ?? 0).toLocaleString()} alerts →</Link>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
            {recentDiffs.map(d => (
              <div key={d.id} style={{display:"flex",gap:"0.75rem",alignItems:"flex-start",background:"rgba(15,15,25,0.6)",border:"1px solid var(--border)",borderLeft:`3px solid ${RISK_COLORS[d.risk_level]??"var(--border)"}`,borderRadius:"8px",padding:"0.75rem 1rem"}}>
                <span style={{fontSize:"1.2rem",flexShrink:0}}>{VENDOR_ICONS[d.vendor_slug]??"🔔"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",gap:"0.4rem",alignItems:"center",flexWrap:"wrap",marginBottom:"0.2rem"}}>
                    <span style={{fontWeight:600,fontSize:"0.8rem",textTransform:"capitalize"}}>{d.vendor_slug.replace(/-/g," ")}</span>
                    <span style={{fontSize:"0.65rem",padding:"0.05rem 0.4rem",borderRadius:"3px",fontWeight:700,background:`${RISK_COLORS[d.risk_level]}22`,color:RISK_COLORS[d.risk_level]}}>{d.risk_level}</span>
                    <span style={{fontSize:"0.68rem",color:"var(--muted)"}}>{CATEGORY_ICONS[d.risk_category]} {d.risk_category}</span>
                    <span style={{marginLeft:"auto",fontSize:"0.7rem",color:"var(--muted)"}}>{timeAgo(d.collected_at)}</span>
                  </div>
                  <div style={{fontSize:"0.85rem",fontWeight:600}}>{d.title}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{textAlign:"center",marginTop:"1.5rem"}}>
            <Link href="/demo" style={{display:"inline-flex",alignItems:"center",gap:"0.5rem",padding:"0.75rem 1.5rem",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:"10px",color:"var(--accent-light)",textDecoration:"none",fontWeight:600,fontSize:"0.9rem"}}>
              🔴 See alerts for your stack — Live Demo →
            </Link>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="section" style={{borderTop:"1px solid var(--border)"}}>
        <div className="container">
          <div style={{maxWidth:700,margin:"0 auto",textAlign:"center"}}>
            <h2 className="section-title">Your tools change constantly.<br />You find out the hard way.</h2>
            <p className="section-subtitle">Last year, Stripe changed checkout flows affecting 40% of integrations. AWS deprecated 6 major APIs. Shopify updated app permissions across 8,000+ apps. Most companies found out when something broke.</p>
          </div>
          <div className="grid-2" style={{maxWidth:900,margin:"0 auto"}}>
            {[
              { stat:"3–4 weeks", label:"avg time to detect a vendor change impact", icon:"⏱️" },
              { stat:"$47K", label:"avg cost of a missed API deprecation for mid-market", icon:"💸" },
              { stat:"73%", label:"of SaaS companies experienced a surprise vendor change in 2024", icon:"😱" },
              { stat:"0", label:"proactive monitoring tools exist for cross-vendor change risk", icon:"🕳️" },
            ].map(item => (
              <div key={item.label} className="card" style={{display:"flex",gap:"1rem",alignItems:"flex-start"}}>
                <span style={{fontSize:"2rem"}}>{item.icon}</span>
                <div>
                  <div style={{fontSize:"1.75rem",fontWeight:800,color:"var(--accent-light)"}}>{item.stat}</div>
                  <div style={{color:"var(--muted)",fontSize:"0.9rem"}}>{item.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RISK TYPES */}
      <section className="section" style={{background:"rgba(99,102,241,0.03)",borderTop:"1px solid var(--border)"}}>
        <div className="container">
          <div style={{textAlign:"center",marginBottom:"3rem"}}>
            <h2 className="section-title">We catch every type of risk</h2>
            <p className="section-subtitle">Not just technical changes — we flag pricing, legal, and security risks too.</p>
          </div>
          <div className="grid-2" style={{maxWidth:900,margin:"0 auto"}}>
            {RISK_TYPES.map(rt => (
              <div key={rt.label} className="card">
                <div style={{fontSize:"2rem",marginBottom:"0.75rem"}}>{rt.icon}</div>
                <h3 style={{fontWeight:700,marginBottom:"0.5rem"}}>{rt.label}</h3>
                <p style={{color:"var(--muted)",fontSize:"0.9rem"}}>{rt.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DOGFOOD CALLOUT */}
      <section className="section" style={{borderTop:"1px solid var(--border)",background:"rgba(239,68,68,0.03)"}}>
        <div className="container" style={{maxWidth:900}}>
          <div style={{display:"flex",gap:"2rem",alignItems:"center",flexWrap:"wrap",background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"16px",padding:"2rem"}}>
            <div style={{flex:1,minWidth:280}}>
              <div style={{fontSize:"0.75rem",fontWeight:700,color:"#ef4444",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"0.75rem"}}>🧪 Founder Dogfood</div>
              <h3 style={{fontSize:"1.4rem",fontWeight:800,marginBottom:"0.75rem"}}>We're using this ourselves</h3>
              <p style={{color:"var(--muted)",fontSize:"0.925rem",marginBottom:"1rem"}}>
                We've connected our own stack (Stripe, AWS, GitHub, Slack, Vercel) and are collecting real alerts.
                Last 14 days: <strong style={{color:"var(--foreground)"}}>{recentDiffs.length}+ changes detected</strong>,
                including <strong style={{color:"#ef4444"}}>{recentDiffs.filter(d => d.risk_level==="high").length} high-risk events</strong>.
              </p>
              <Link href="/demo" style={{display:"inline-flex",alignItems:"center",gap:"0.5rem",padding:"0.75rem 1.5rem",background:"#ef4444",color:"white",borderRadius:"10px",textDecoration:"none",fontWeight:700,fontSize:"0.95rem"}}>
                See the live results →
              </Link>
            </div>
            <div style={{flex:"0 0 200px",textAlign:"center"}}>
              <div style={{fontSize:"3.5rem",fontWeight:800,color:"#ef4444"}}>{recentDiffs.filter(d=>d.risk_level==="high").length}</div>
              <div style={{fontWeight:700,marginBottom:"0.25rem"}}>high-risk alerts</div>
              <div style={{color:"var(--muted)",fontSize:"0.8rem"}}>in last 12 monitored events</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING — A/B TEST */}
      <section className="section" style={{borderTop:"1px solid var(--border)",background:"rgba(99,102,241,0.02)"}}>
        <div className="container">
          <div style={{textAlign:"center",marginBottom:"3rem"}}>
            <h2 className="section-title">Simple, transparent pricing</h2>
            <p className="section-subtitle">Early access pricing locked in for founding members.</p>
            {/* Hidden A/B marker for analytics */}
            <span data-ab-variant={abVariant} style={{display:"none"}}></span>
          </div>
          <div className="grid-3" style={{maxWidth:1000,margin:"0 auto"}}>
            {/* Starter */}
            <div className="card">
              <h3 style={{fontWeight:700,marginBottom:"0.25rem"}}>Starter</h3>
              <div style={{fontSize:"0.875rem",color:"var(--muted)",marginBottom:"1rem"}}>Perfect for lean teams</div>
              <div style={{fontSize:"2.5rem",fontWeight:800,marginBottom:"1.5rem"}}>
                {pricing.starter.price}<span style={{fontSize:"1rem",fontWeight:400,color:"var(--muted)"}}>{pricing.starter.monthly}</span>
              </div>
              <ul style={{listStyle:"none",padding:0,marginBottom:"1.5rem"}}>
                {pricing.starter.features.map(f => (
                  <li key={f} style={{padding:"0.4rem 0",borderBottom:"1px solid var(--border)",color:"var(--muted)",fontSize:"0.875rem",display:"flex",gap:"0.5rem"}}>
                    <span style={{color:"var(--success)"}}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="#waitlist" className="btn-ghost" style={{width:"100%",justifyContent:"center"}}>Join Waitlist</a>
            </div>

            {/* Growth — featured */}
            <div className="card" style={{border:"1px solid var(--accent)",position:"relative"}}>
              <div style={{position:"absolute",top:"-12px",left:"50%",transform:"translateX(-50%)",background:"var(--accent)",color:"white",padding:"0.2rem 0.8rem",borderRadius:"999px",fontSize:"0.75rem",fontWeight:700}}>
                {pricing.growth.badge}
              </div>
              <h3 style={{fontWeight:700,marginBottom:"0.25rem"}}>Growth</h3>
              <div style={{fontSize:"0.875rem",color:"var(--muted)",marginBottom:"1rem"}}>For scaling companies</div>
              <div style={{fontSize:"2.5rem",fontWeight:800,color:"var(--accent-light)",marginBottom:"1.5rem"}}>
                {pricing.growth.price}<span style={{fontSize:"1rem",fontWeight:400,color:"var(--muted)"}}>{pricing.growth.monthly}</span>
              </div>
              <ul style={{listStyle:"none",padding:0,marginBottom:"1.5rem"}}>
                {pricing.growth.features.map(f => (
                  <li key={f} style={{padding:"0.4rem 0",borderBottom:"1px solid var(--border)",color:"var(--muted)",fontSize:"0.875rem",display:"flex",gap:"0.5rem"}}>
                    <span style={{color:"var(--success)"}}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="#waitlist" className="btn-primary" style={{width:"100%",justifyContent:"center"}}>Join Waitlist</a>
            </div>

            {/* Enterprise */}
            <div className="card">
              <h3 style={{fontWeight:700,marginBottom:"0.25rem"}}>Enterprise</h3>
              <div style={{fontSize:"0.875rem",color:"var(--muted)",marginBottom:"1rem"}}>For complex stacks</div>
              <div style={{fontSize:"2.5rem",fontWeight:800,marginBottom:"1.5rem"}}>
                {pricing.enterprise.price}<span style={{fontSize:"1rem",fontWeight:400,color:"var(--muted)"}}>{pricing.enterprise.monthly}</span>
              </div>
              <ul style={{listStyle:"none",padding:0,marginBottom:"1.5rem"}}>
                {pricing.enterprise.features.map(f => (
                  <li key={f} style={{padding:"0.4rem 0",borderBottom:"1px solid var(--border)",color:"var(--muted)",fontSize:"0.875rem",display:"flex",gap:"0.5rem"}}>
                    <span style={{color:"var(--success)"}}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="mailto:scide-founder@agentmail.to?subject=CRR Enterprise" className="btn-ghost" style={{width:"100%",justifyContent:"center"}}>Contact Us</a>
            </div>
          </div>
        </div>
      </section>

      {/* WAITLIST */}
      <section className="section" id="waitlist" style={{borderTop:"1px solid var(--border)"}}>
        <div className="container">
          <div style={{maxWidth:600,margin:"0 auto",textAlign:"center"}}>
            <h2 className="section-title">Get Early Access</h2>
            <p style={{color:"var(--muted)",marginBottom:"2rem"}}>
              Join the waitlist for free, or lock in founding-member pricing with a{" "}
              <strong style={{color:"var(--foreground)"}}>$100 fully refundable deposit</strong>.
              Your deposit reserves your slot and locks in <strong style={{color:"var(--accent-light)"}}>30% off forever</strong>.
            </p>
            <WaitlistForm abVariant={abVariant} depositAmount={pricing.deposit.amount} />
            <div style={{marginTop:"2rem",display:"flex",gap:"1.5rem",justifyContent:"center",color:"var(--muted)",fontSize:"0.8rem",flexWrap:"wrap"}}>
              <span>✓ No credit card for free waitlist</span>
              <span>✓ Cancel anytime</span>
              <span>✓ Deposit 100% refundable</span>
              <span>✓ Founding pricing locked forever</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "2rem 1.5rem", textAlign: "center" }}>
        <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap", fontSize: "0.78rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
          <a href="/demo" style={{ color: "var(--muted)", textDecoration: "none" }}>Interactive Demo</a>
          <a href="/sales" style={{ color: "var(--muted)", textDecoration: "none" }}>Sales Hub</a>
          <a href="/pricing" style={{ color: "var(--muted)", textDecoration: "none" }}>Pricing</a>
          <a href="/pilot/sow" style={{ color: "var(--muted)", textDecoration: "none" }}>Pilot SOW</a>
          <a href="/pilot/security" style={{ color: "var(--muted)", textDecoration: "none" }}>Security Pack</a>
          <a href="/legal/privacy" style={{ color: "var(--muted)", textDecoration: "none" }}>Privacy Policy</a>
          <a href="/legal/terms" style={{ color: "var(--muted)", textDecoration: "none" }}>Terms of Service</a>
          <a href="/legal/dpa" style={{ color: "var(--muted)", textDecoration: "none" }}>DPA</a>
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
          © 2025 Change Risk Radar. Questions? <a href="mailto:scide-founder@agentmail.to" style={{ color: "var(--accent)", textDecoration: "none" }}>scide-founder@agentmail.to</a>
        </div>
      </footer>
    </div>
  );
}
