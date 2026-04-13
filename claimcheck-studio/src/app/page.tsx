import type { Metadata } from "next";
import LeadForm from "@/components/LeadForm";
import Analytics from "@/components/Analytics";

export const metadata: Metadata = {
  title: "ClaimCheck Studio — Evidence-Backed Content, Effortlessly",
  description:
    "Turn manuscripts, slides, and transcripts into channel-ready content backed by peer-reviewed sources. Auto-extract claims, find supporting evidence, flag unsupported assertions.",
  openGraph: {
    title: "ClaimCheck Studio",
    description:
      "Evidence-backed content studio for health, science, and regulated industries.",
    url: "https://citebundle.com",
    siteName: "ClaimCheck Studio",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClaimCheck Studio",
    description: "Evidence-backed content studio.",
  },
};

export default function Home() {
  return (
    <main
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        margin: 0,
        padding: 0,
        background: "#fafbff",
      }}
    >
      <Analytics />

      {/* Nav */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "rgba(10,10,20,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.85rem 2rem",
        }}
      >
        <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>📋</span>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>ClaimCheck Studio</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a
            href="/login"
            style={{
              color: "#c7d2fe",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500,
              padding: "0.45rem 1rem",
              borderRadius: 6,
              border: "1px solid rgba(165,180,252,0.3)",
              transition: "background 0.2s",
            }}
          >
            Log in
          </a>
          <a
            href="/login"
            style={{
              background: "#4f46e5",
              color: "#fff",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
              padding: "0.45rem 1.2rem",
              borderRadius: 6,
            }}
          >
            Get started
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          background:
            "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          color: "white",
          paddingTop: "7rem",
          padding: "7rem 2rem 4rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-block",
              background: "rgba(79,70,229,0.3)",
              border: "1px solid rgba(79,70,229,0.5)",
              borderRadius: 20,
              padding: "0.4rem 1.2rem",
              fontSize: "0.85rem",
              marginBottom: "1.5rem",
            }}
          >
            🔬 FOR HEALTH &amp; SCIENCE COMMUNICATORS
          </div>
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: "1.5rem",
            }}
          >
            Every Claim,{" "}
            <span style={{ color: "#a5b4fc" }}>Backed by Evidence</span>
          </h1>
          <p
            style={{
              fontSize: "1.25rem",
              color: "#c7d2fe",
              lineHeight: 1.6,
              marginBottom: "2.5rem",
              maxWidth: 580,
              margin: "0 auto 2.5rem",
            }}
          >
            ClaimCheck Studio extracts factual claims from your content, finds
            supporting peer-reviewed sources, and auto-generates channel-ready
            outputs — tweet, LinkedIn thread, blog, slides — with a downloadable
            citation bundle.
          </p>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {[
              "PubMed & CrossRef integration",
              "Confidence scores on every claim",
              "Compliance-ready audit trail",
            ].map((f) => (
              <span
                key={f}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 20,
                  padding: "0.4rem 1rem",
                  fontSize: "0.875rem",
                }}
              >
                ✓ {f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        style={{ padding: "4rem 2rem", maxWidth: 1000, margin: "0 auto" }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: "2rem",
            fontWeight: 700,
            marginBottom: "3rem",
            color: "#1a1a2e",
          }}
        >
          From Draft to Defensible Content
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "2rem",
          }}
        >
          {[
            {
              emoji: "📄",
              title: "Upload Any Format",
              desc: "Manuscripts, slide decks, transcripts, PDFs. We handle the parsing.",
            },
            {
              emoji: "🔍",
              title: "Claim Extraction",
              desc: "LLMs identify every factual assertion. Nothing slips through unverified.",
            },
            {
              emoji: "📚",
              title: "Evidence Graph Search",
              desc: "Automatically queries PubMed, CrossRef, Scite, and Unpaywall for supporting sources.",
            },
            {
              emoji: "📊",
              title: "Confidence Scoring",
              desc: "Each claim gets a provenance score. Unsupported or risky assertions are flagged.",
            },
            {
              emoji: "✍️",
              title: "Channel-Ready Outputs",
              desc: "Auto-generates tweet, LinkedIn thread, blog post, and slide copy — literacy-adapted.",
            },
            {
              emoji: "📦",
              title: "Citation Bundle",
              desc: "Export DOIs, plain-language summaries, source excerpts, and snapshot PDFs.",
            },
          ].map(({ emoji, title, desc }) => (
            <div
              key={title}
              style={{
                background: "white",
                borderRadius: 12,
                padding: "2rem",
                border: "1px solid #e0e7ff",
                boxShadow: "0 2px 8px rgba(79,70,229,0.06)",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>
                {emoji}
              </div>
              <h3
                style={{
                  fontWeight: 700,
                  marginBottom: "0.5rem",
                  color: "#1a1a2e",
                }}
              >
                {title}
              </h3>
              <p style={{ color: "#64748b", lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Lead Form */}
      <section
        id="waitlist"
        style={{
          background: "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)",
          padding: "4rem 2rem",
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2
            style={{
              textAlign: "center",
              fontSize: "2rem",
              fontWeight: 700,
              marginBottom: "0.75rem",
              color: "#1a1a2e",
            }}
          >
            Get Early Access
          </h2>
          <p
            style={{
              textAlign: "center",
              color: "#64748b",
              marginBottom: "2.5rem",
            }}
          >
            Join health communicators, science journalists, and compliance teams
            already on the list.
          </p>
          <LeadForm />
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: "#1a1a2e",
          color: "#94a3b8",
          padding: "2rem",
          textAlign: "center",
          fontSize: "0.875rem",
        }}
      >
        <p>
          © {new Date().getFullYear()} ClaimCheck Studio ·{" "}
          <a href="https://citebundle.com" style={{ color: "#a5b4fc" }}>
            citebundle.com
          </a>{" "}
          ·{" "}
          <a href="mailto:hello@citebundle.com" style={{ color: "#a5b4fc" }}>
            hello@citebundle.com
          </a>
        </p>
        <p style={{ marginTop: "0.5rem" }}>
          <a href="/privacy" style={{ color: "#64748b" }}>
            Privacy
          </a>{" "}
          ·{" "}
          <a href="/terms" style={{ color: "#64748b", marginLeft: "1rem" }}>
            Terms
          </a>
        </p>
      </footer>
    </main>
  );
}
