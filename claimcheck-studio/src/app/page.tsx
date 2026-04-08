import LeadForm from "@/components/LeadForm";

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Upload your content",
    desc: "Paste or upload a manuscript, slide deck, or transcript. We accept PDF, DOCX, PPTX, and plain text.",
  },
  {
    step: "2",
    title: "Claims extracted & evidence searched",
    desc: "Our LLM pipeline extracts every factual assertion, then queries PubMed, CrossRef, Scite, and Unpaywall to locate peer-reviewed support.",
  },
  {
    step: "3",
    title: "Risks flagged, compliance applied",
    desc: "Unsupported or contradicted assertions are highlighted. An optional compliance agent enforces regulatory phrasing and produces an auditable review trail.",
  },
  {
    step: "4",
    title: "Channel-ready outputs + citation bundle",
    desc: "Get a tweet thread, LinkedIn post, explainer blog, or slide copy — plus a downloadable citation bundle with DOIs, plain-language summaries, source excerpts, and snapshot PDFs.",
  },
];

const FOR_WHO = [
  {
    icon: "✍️",
    title: "Medical Writers",
    desc: "Slash research time. Every claim arrives pre-linked to its best peer-reviewed source.",
  },
  {
    icon: "🏥",
    title: "Medical Affairs & MSLs",
    desc: "Go from internal data packages to compliant field materials without a separate review cycle.",
  },
  {
    icon: "📰",
    title: "Health & Science Media Editors",
    desc: "Publish with confidence. Automated provenance scores surface shaky claims before they go live.",
  },
  {
    icon: "📣",
    title: "Life-Science Marketing & Comms",
    desc: "Generate evidence-backed social and web copy at scale, complete with an audit trail for legal review.",
  },
];

export default function Home() {
  return (
    <div style={styles.page}>
      {/* NAV */}
      <nav style={styles.nav}>
        <span style={styles.logo}>
          <span style={styles.logoMark}>⬡</span> ClaimCheck Studio
        </span>
        <a href="#early-access" style={styles.navCta}>
          Request Early Access
        </a>
      </nav>

      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroBadge}>Now in private beta · Biomedical-first</div>
        <h1 style={styles.h1}>
          Evidence‑backed, channel‑ready content from your manuscripts and transcripts
        </h1>
        <p style={styles.subhead}>
          ClaimCheck Studio extracts factual claims, finds peer‑reviewed support across{" "}
          <strong>PubMed / CrossRef / Scite / Unpaywall</strong>, assigns provenance scores,
          flags risks, and auto‑generates compliant, channel‑ready outputs.
        </p>
        <a href="#early-access" style={styles.heroCta}>
          Request early access →
        </a>
      </section>

      {/* HOW IT WORKS */}
      <section style={styles.section}>
        <h2 style={styles.h2}>How it works</h2>
        <div style={styles.steps}>
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} style={styles.stepCard}>
              <div style={styles.stepNumber}>{item.step}</div>
              <h3 style={styles.stepTitle}>{item.title}</h3>
              <p style={styles.stepDesc}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section style={{ ...styles.section, backgroundColor: "#f8fafc" }}>
        <h2 style={styles.h2}>Who it&apos;s for</h2>
        <div style={styles.cards}>
          {FOR_WHO.map((item) => (
            <div key={item.title} style={styles.card}>
              <div style={styles.cardIcon}>{item.icon}</div>
              <h3 style={styles.cardTitle}>{item.title}</h3>
              <p style={styles.cardDesc}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LEAD CAPTURE */}
      <section id="early-access" style={styles.formSection}>
        <h2 style={styles.h2}>Get early access</h2>
        <p style={styles.formSubhead}>
          We&apos;re onboarding a limited cohort of life-science teams. Tell us about yourself and
          we&apos;ll be in touch.
        </p>
        <LeadForm />
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          © {new Date().getFullYear()} ClaimCheck Studio ·{" "}
          <a href="/privacy" style={styles.footerLink}>Privacy</a> ·{" "}
          <a href="/terms" style={styles.footerLink}>Terms</a> ·{" "}
          <a href="mailto:hello@citebundle.com" style={styles.footerLink}>
            hello@citebundle.com
          </a>
        </p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#1a1a2e",
    margin: 0,
    padding: 0,
  },
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 2rem",
    borderBottom: "1px solid #e5e7eb",
    position: "sticky",
    top: 0,
    backgroundColor: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(8px)",
    zIndex: 100,
  },
  logo: {
    fontSize: "1.1rem",
    fontWeight: 800,
    color: "#2563eb",
    letterSpacing: "-0.02em",
  },
  logoMark: {
    marginRight: "0.3rem",
  },
  navCta: {
    padding: "0.5rem 1.1rem",
    backgroundColor: "#2563eb",
    color: "#fff",
    borderRadius: "7px",
    textDecoration: "none",
    fontSize: "0.875rem",
    fontWeight: 600,
  },
  hero: {
    maxWidth: "820px",
    margin: "0 auto",
    padding: "5rem 2rem 4rem",
    textAlign: "center",
  },
  heroBadge: {
    display: "inline-block",
    padding: "0.3rem 0.9rem",
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    borderRadius: "999px",
    fontSize: "0.8rem",
    fontWeight: 600,
    marginBottom: "1.5rem",
    letterSpacing: "0.03em",
    textTransform: "uppercase",
  },
  h1: {
    fontSize: "clamp(2rem, 5vw, 3rem)",
    fontWeight: 900,
    lineHeight: 1.15,
    letterSpacing: "-0.03em",
    margin: "0 0 1.25rem",
    color: "#0f172a",
  },
  subhead: {
    fontSize: "1.15rem",
    lineHeight: 1.7,
    color: "#4b5563",
    margin: "0 0 2rem",
  },
  heroCta: {
    display: "inline-block",
    padding: "0.9rem 2.2rem",
    backgroundColor: "#2563eb",
    color: "#fff",
    borderRadius: "10px",
    textDecoration: "none",
    fontSize: "1.05rem",
    fontWeight: 700,
    letterSpacing: "0.01em",
    transition: "background-color 0.2s",
  },
  section: {
    padding: "5rem 2rem",
    maxWidth: "1100px",
    margin: "0 auto",
  },
  h2: {
    fontSize: "clamp(1.5rem, 3vw, 2rem)",
    fontWeight: 800,
    textAlign: "center",
    margin: "0 0 3rem",
    color: "#0f172a",
    letterSpacing: "-0.02em",
  },
  steps: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "2rem",
  },
  stepCard: {
    padding: "1.75rem",
    border: "1.5px solid #e5e7eb",
    borderRadius: "12px",
    backgroundColor: "#fff",
  },
  stepNumber: {
    width: "2.2rem",
    height: "2.2rem",
    borderRadius: "50%",
    backgroundColor: "#dbeafe",
    color: "#2563eb",
    fontWeight: 800,
    fontSize: "1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "1rem",
  },
  stepTitle: {
    fontSize: "1rem",
    fontWeight: 700,
    margin: "0 0 0.5rem",
    color: "#0f172a",
  },
  stepDesc: {
    fontSize: "0.9rem",
    lineHeight: 1.65,
    color: "#6b7280",
    margin: 0,
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.5rem",
    maxWidth: "1100px",
    margin: "0 auto",
  },
  card: {
    padding: "1.75rem",
    backgroundColor: "#fff",
    borderRadius: "12px",
    border: "1.5px solid #e5e7eb",
  },
  cardIcon: {
    fontSize: "2rem",
    marginBottom: "0.75rem",
  },
  cardTitle: {
    fontSize: "1rem",
    fontWeight: 700,
    margin: "0 0 0.5rem",
    color: "#0f172a",
  },
  cardDesc: {
    fontSize: "0.9rem",
    lineHeight: 1.65,
    color: "#6b7280",
    margin: 0,
  },
  formSection: {
    padding: "5rem 2rem",
    textAlign: "center",
    backgroundColor: "#f8fafc",
  },
  formSubhead: {
    color: "#6b7280",
    fontSize: "1rem",
    margin: "-2rem 0 2rem",
    lineHeight: 1.6,
  },
  footer: {
    borderTop: "1px solid #e5e7eb",
    padding: "2rem",
    textAlign: "center",
  },
  footerText: {
    fontSize: "0.875rem",
    color: "#9ca3af",
    margin: 0,
  },
  footerLink: {
    color: "#6b7280",
    textDecoration: "none",
  },
};
