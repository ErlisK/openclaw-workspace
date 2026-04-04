"use client";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-auth";

type AuthMode = "login" | "signup";

export default function AuthClient({ mode, redirectTo }: { mode: AuthMode; redirectTo?: string }) {
  const [authMode, setAuthMode] = useState<AuthMode>(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const supabase = createSupabaseBrowserClient();

  const redirect = redirectTo || "/onboard";

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (authMode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { org_name: orgName },
          emailRedirectTo: `${location.origin}/api/auth/callback?next=${redirect}`,
        },
      });
      if (error) { setError(error.message); setLoading(false); return; }
      setMessage("Check your email for a confirmation link.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      window.location.href = redirect;
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/api/auth/callback?next=${redirect}`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function handleMagicLink() {
    if (!email) { setError("Enter your email first."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/api/auth/callback?next=${redirect}` },
    });
    if (error) { setError(error.message); } else { setMessage("Magic link sent — check your email."); }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.25rem" }}>Change Risk Radar</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
          {authMode === "signup" ? "Create your account" : "Sign in to your account"}
        </p>
      </div>

      <div className="card" style={{ padding: "1.75rem" }}>
        {message ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📬</div>
            <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{message}</p>
            <button onClick={() => setMessage("")} style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem" }}>
              ← Back
            </button>
          </div>
        ) : (
          <>
            {/* Google OAuth */}
            <button onClick={handleGoogle} disabled={loading} style={{
              width: "100%", padding: "0.65rem 1rem", marginBottom: "1rem",
              background: "white", color: "#374151", border: "1px solid #d1d5db",
              borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.875rem",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem",
              opacity: loading ? 0.6 : 1,
            }}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64l7.08 5.5c4.13-3.81 6.59-9.42 6.59-16.15z"/>
                <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.35l-7.08-5.5c-1.97 1.32-4.49 2.1-7.48 2.1-5.75 0-10.62-3.88-12.36-9.1H4.34l-7.26 5.48C7.08 41.48 15 46 24 46z"/>
                <path fill="#FBBC05" d="M11.64 28.15c-.44-1.32-.69-2.72-.69-4.15 0-1.43.25-2.83.69-4.15V14.37H4.34A22 22 0 002 24c0 3.53.84 6.87 2.34 9.78l7.3-5.63z"/>
                <path fill="#EA4335" d="M24 9.75c3.24 0 6.15 1.11 8.44 3.29l6.33-6.33C34.9 3.09 29.92 1 24 1 15 1 7.08 5.52 4.08 14.19l7.3 5.63C13.38 13.63 18.25 9.75 24 9.75z"/>
              </svg>
              Continue with Google
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>or email</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>

            <form onSubmit={handleEmailAuth}>
              {authMode === "signup" && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "var(--muted)", marginBottom: "0.3rem" }}>Company name</label>
                  <input value={orgName} onChange={e => setOrgName(e.target.value)} required
                    placeholder="Acme Corp"
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.875rem", boxSizing: "border-box" }} />
                </div>
              )}
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", color: "var(--muted)", marginBottom: "0.3rem" }}>Work email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@company.com"
                  style={{ width: "100%", padding: "0.6rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", color: "var(--muted)", marginBottom: "0.3rem" }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                  placeholder="8+ characters"
                  style={{ width: "100%", padding: "0.6rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>

              {error && <p style={{ color: "#ef4444", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{error}</p>}

              <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", marginBottom: "0.5rem" }}>
                {loading ? "…" : authMode === "signup" ? "Create account →" : "Sign in →"}
              </button>
            </form>

            <button onClick={handleMagicLink} disabled={loading}
              style={{ width: "100%", background: "transparent", border: "1px dashed var(--border)", borderRadius: 6, padding: "0.5rem", color: "var(--muted)", fontSize: "0.78rem", cursor: "pointer", marginBottom: "1rem" }}>
              ✉️ Send magic link instead
            </button>

            <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--muted)" }}>
              {authMode === "signup" ? "Already have an account? " : "Don&apos;t have an account? "}
              <button onClick={() => { setAuthMode(authMode === "signup" ? "login" : "signup"); setError(""); }}
                style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                {authMode === "signup" ? "Sign in" : "Create one"}
              </button>
            </p>
          </>
        )}
      </div>

      <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--muted)", marginTop: "1rem" }}>
        By signing up you agree to our{" "}
        <a href="/onboard" style={{ color: "var(--accent)" }}>Terms of Service</a> and{" "}
        <a href="/onboard" style={{ color: "var(--accent)" }}>DPA</a>.
      </p>
    </div>
  );
}
