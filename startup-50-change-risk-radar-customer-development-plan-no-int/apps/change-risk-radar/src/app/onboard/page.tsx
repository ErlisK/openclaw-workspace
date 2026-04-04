import type { Metadata } from "next";
import OnboardClient from "./OnboardClient";

export const metadata: Metadata = {
  title: "Early Access — Change Risk Radar",
  description: "Set up your Change Risk Radar in 3 minutes. No meetings required.",
};

export default function OnboardPage() {
  return (
    <div style={{ padding: "2.5rem 0" }}>
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 2rem" }}>
          <div className="tag" style={{ marginBottom: "0.75rem" }}>Self-Serve Early Access</div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.75rem" }}>
            Set Up Your Risk Radar
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "1rem" }}>
            3 steps, 3 minutes. No meetings, no integration calls — just configure your vendors
            and get your first alert within 24 hours.
          </p>
        </div>

        <OnboardClient />

        {/* Trust signals */}
        <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", marginTop: "2rem", flexWrap: "wrap" }}>
          {[
            "✅ No vendor credentials required",
            "🔒 Only public pages monitored",
            "💰 $100 deposit 100% refundable",
            "📧 Weekly briefs via email",
          ].map(s => (
            <span key={s} style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
