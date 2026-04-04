"use client";
import { useState } from "react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [topTool, setTopTool] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [withDeposit, setWithDeposit] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company, role, top_tool: topTool }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join");
      
      if (withDeposit) {
        // Redirect to deposit checkout
        const depRes = await fetch("/api/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const depData = await depRes.json();
        if (depData.url) {
          window.location.href = depData.url;
          return;
        }
      }
      
      setStatus("success");
      setMsg("You're on the list! We'll be in touch soon.");
    } catch (err: unknown) {
      setStatus("error");
      setMsg(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
        <h3 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>You're in!</h3>
        <p style={{ color: "var(--muted)" }}>{msg}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ textAlign: "left" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem", color: "var(--muted)" }}>
            Work email *
          </label>
          <input
            type="email" required value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem", color: "var(--muted)" }}>
              Company
            </label>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corp" />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem", color: "var(--muted)" }}>
              Your role
            </label>
            <input value={role} onChange={e => setRole(e.target.value)} placeholder="CTO / Ops Lead" />
          </div>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem", color: "var(--muted)" }}>
            Which tool change would hurt you most if you missed it?
          </label>
          <input value={topTool} onChange={e => setTopTool(e.target.value)} placeholder="e.g. Stripe changing fees, AWS deprecating a service..." />
        </div>

        {/* Deposit option */}
        <div className="card" style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <label style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", cursor: "pointer" }}>
            <input
              type="checkbox" checked={withDeposit}
              onChange={e => setWithDeposit(e.target.checked)}
              style={{ width: "auto", marginTop: "3px" }}
            />
            <div>
              <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                💎 Reserve my spot — $50 refundable deposit
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                Lock in founding-member pricing (30% off forever) + priority access.
                100% refunded if we don't launch or you change your mind.
              </div>
            </div>
          </label>
        </div>

        {msg && status === "error" && (
          <div style={{ padding: "0.75rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", color: "#ef4444", fontSize: "0.875rem" }}>
            {msg}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={status === "loading"}
          style={{ justifyContent: "center", opacity: status === "loading" ? 0.7 : 1 }}
        >
          {status === "loading" ? "⏳ Joining..." : withDeposit ? "🚀 Reserve My Spot ($50)" : "🎯 Join the Waitlist — Free"}
        </button>

        <p style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center" }}>
          No spam. No credit card required for free waitlist.
        </p>
      </div>
    </form>
  );
}
