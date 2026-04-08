export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "4rem 2rem", fontFamily: "sans-serif" }}>
      <h1>Privacy Policy</h1>
      <p><em>Last updated: {new Date().toLocaleDateString()}</em></p>
      <p>
        ClaimCheck Studio (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your privacy.
        This page is a placeholder for our full privacy policy, which will be published before
        general availability.
      </p>
      <h2>Data We Collect</h2>
      <p>
        During the early-access phase, we collect name, email, company, and role when you
        request access. We use this solely to contact you about ClaimCheck Studio.
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
