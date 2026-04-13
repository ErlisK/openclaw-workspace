import Link from "next/link";

export const metadata = { title: "Deposit Confirmed — Change Risk Radar" };

export default function DepositSuccess() {
  return (
    <div style={{ padding: "5rem 0", textAlign: "center" }}>
      <div className="container" style={{ maxWidth: 560 }}>
        <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>💎</div>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.75rem" }}>
          You're a founding member!
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: "2rem", fontSize: "1.1rem" }}>
          Your $100 deposit is confirmed. You've locked in founding-member pricing —
          <strong style={{ color: "var(--foreground)" }}> 30% off Growth plan forever</strong> + first access to beta.
        </p>
        <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "12px", padding: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
            What happens next
          </div>
          <ol style={{ textAlign: "left", color: "var(--muted)", fontSize: "0.9rem", paddingLeft: "1.25rem" }}>
            <li style={{ marginBottom: "0.5rem" }}>We'll email you within 24 hours with beta access details</li>
            <li style={{ marginBottom: "0.5rem" }}>You'll configure your stack (which tools to monitor)</li>
            <li style={{ marginBottom: "0.5rem" }}>First alerts arrive within 24 hours of setup</li>
            <li>Your founding pricing is locked in permanently</li>
          </ol>
        </div>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/demo" className="btn-primary">Explore the demo →</Link>
          <Link href="/observatory" className="btn-ghost">View observatory</Link>
        </div>
      </div>
    </div>
  );
}
