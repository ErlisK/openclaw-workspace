export default function TermsPage() {
  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "4rem 2rem", fontFamily: "sans-serif" }}>
      <h1>Terms of Service</h1>
      <p><em>Last updated: {new Date().toLocaleDateString()}</em></p>
      <p>
        This page is a placeholder for ClaimCheck Studio&apos;s Terms of Service, which will be
        published before general availability.
      </p>
      <h2>Early Access</h2>
      <p>
        During private beta, access is provided &quot;as-is&quot; for evaluation purposes only. No SLA
        or warranty is implied.
      </p>
      <h2>Contact</h2>
      <p>
        Questions? Email us at{" "}
        <a href="mailto:hello@citebundle.com">hello@citebundle.com</a>.
      </p>
      <p><a href="/">← Back to home</a></p>
    </div>
  );
}
