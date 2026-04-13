"use client";
import { useState, useEffect } from "react";

interface Props {
  abVariant?: "A" | "B";
  depositAmount?: string;
}

export default function WaitlistForm({ abVariant = "A", depositAmount = "$100" }: Props) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [topTool, setTopTool] = useState("");
  const [withDeposit, setWithDeposit] = useState(false);
  const [status, setStatus] = useState<"idle"|"loading"|"success"|"deposit-intent"|"error">("idle");
  const [msg, setMsg] = useState("");

  // Track pageview with variant
  useEffect(() => {
    const variant = abVariant || document.cookie.match(/ab_pricing=([AB])/)?.[1] || "A";
    fetch("/api/ab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "pageview", variant }),
    }).catch(() => {});
  }, [abVariant]);

  const trackEvent = (event: string) => {
    fetch("/api/ab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, variant: abVariant, email: email || undefined }),
    }).catch(() => {});
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      // 1. Save waitlist entry
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company, role, top_tool: topTool }),
      });
      if (!res.ok) throw new Error("Failed to join waitlist");

      trackEvent("waitlist_signup");

      // 2. Handle deposit if checked
      if (withDeposit) {
        trackEvent("deposit_intent");

        const depRes = await fetch("/api/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, company, variant: abVariant }),
        });
        const depData = await depRes.json();

        if (depData.url) {
          // Redirect to Stripe checkout
          trackEvent("deposit_started");
          window.location.href = depData.url;
          return;
        } else {
          // Deposit intent recorded — payment link coming
          setStatus("deposit-intent");
          return;
        }
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (status === "success") {
    return (
      <div className="card" style={{textAlign:"center",padding:"2.5rem"}}>
        <div style={{fontSize:"3rem",marginBottom:"1rem"}}>🎉</div>
        <h3 style={{fontWeight:700,marginBottom:"0.5rem"}}>You're on the list!</h3>
        <p style={{color:"var(--muted)"}}>We'll reach out when personalized stack monitoring is ready for you.</p>
        <p style={{fontSize:"0.8rem",color:"var(--muted)",marginTop:"1rem"}}>
          In the meantime, check what changed in your stack this week →{" "}
          <a href="/demo" style={{color:"var(--accent-light)"}}>Live Demo</a>
        </p>
      </div>
    );
  }

  if (status === "deposit-intent") {
    return (
      <div className="card" style={{textAlign:"center",padding:"2.5rem"}}>
        <div style={{fontSize:"3rem",marginBottom:"1rem"}}>💎</div>
        <h3 style={{fontWeight:700,marginBottom:"0.5rem"}}>Deposit Reserved!</h3>
        <div style={{background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:"10px",padding:"1rem",marginBottom:"1rem",fontSize:"0.875rem",color:"var(--muted)"}}>
          Check <strong style={{color:"var(--foreground)"}}>{email}</strong> — we're sending you a secure Stripe payment link for {depositAmount} within 24 hours.
        </div>
        <p style={{fontSize:"0.8rem",color:"var(--muted)"}}>
          Your slot is reserved. The {depositAmount} deposit locks in founding-member pricing (30% off) + first access.
        </p>
        <a href="/demo" style={{display:"inline-block",marginTop:"1rem",color:"var(--accent-light)",fontSize:"0.875rem"}}>
          Explore the demo while you wait →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{textAlign:"left"}}>
      <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
        <div>
          <label style={{display:"block",marginBottom:"0.4rem",fontSize:"0.875rem",color:"var(--muted)"}}>Work email *</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
          <div>
            <label style={{display:"block",marginBottom:"0.4rem",fontSize:"0.875rem",color:"var(--muted)"}}>Company</label>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corp" />
          </div>
          <div>
            <label style={{display:"block",marginBottom:"0.4rem",fontSize:"0.875rem",color:"var(--muted)"}}>Your role</label>
            <input value={role} onChange={e => setRole(e.target.value)} placeholder="CTO / Ops Lead" />
          </div>
        </div>
        <div>
          <label style={{display:"block",marginBottom:"0.4rem",fontSize:"0.875rem",color:"var(--muted)"}}>Which vendor change would hurt you most if you missed it?</label>
          <input value={topTool} onChange={e => setTopTool(e.target.value)} placeholder="e.g. Stripe fees, AWS deprecation, Shopify checkout..." />
        </div>

        {/* Deposit option */}
        <div className="card" style={{background:"rgba(99,102,241,0.05)",border:"1px solid rgba(99,102,241,0.2)"}}>
          <label style={{display:"flex",gap:"0.75rem",alignItems:"flex-start",cursor:"pointer"}}>
            <input type="checkbox" checked={withDeposit} onChange={e => setWithDeposit(e.target.checked)} style={{width:"auto",marginTop:"3px"}} />
            <div>
              <div style={{fontWeight:600,marginBottom:"0.25rem"}}>
                💎 Lock in founding-member pricing — {depositAmount} refundable deposit
              </div>
              <div style={{fontSize:"0.8rem",color:"var(--muted)"}}>
                <strong style={{color:"var(--accent-light)"}}>30% off forever</strong> + skip the queue + direct input on which vendors we monitor.
                100% refunded if we don't deliver or you change your mind. No questions asked.
              </div>
            </div>
          </label>
        </div>

        {status === "error" && (
          <div style={{padding:"0.75rem",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"8px",color:"#ef4444",fontSize:"0.875rem"}}>{msg}</div>
        )}

        <button type="submit" className="btn-primary" disabled={status === "loading"} style={{justifyContent:"center",opacity:status==="loading"?0.7:1}}>
          {status === "loading" ? "⏳ Saving..." : withDeposit ? `💎 Reserve with ${depositAmount} Deposit` : "🎯 Join Waitlist — Free"}
        </button>

        <p style={{fontSize:"0.75rem",color:"var(--muted)",textAlign:"center"}}>No spam. Deposit 100% refundable. Founding pricing locked forever.</p>
        <p style={{fontSize:"0.65rem",color:"rgba(255,255,255,0.2)",textAlign:"center"}} data-ab={abVariant}>variant: {abVariant}</p>
      </div>
    </form>
  );
}
