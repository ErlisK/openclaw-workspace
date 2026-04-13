"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.replace(nextPath);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Invalid password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center",
      justifyContent: "center", fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 16, padding: 48, width: 400, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
        <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>ClaimCheck Studio</h1>
        <p style={{ color: "#888", fontSize: 14, marginBottom: 32 }}>Admin access</p>

        <form onSubmit={handleLogin}>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 8,
              border: "1px solid #333", background: "#1a1a1a", color: "#fff",
              fontSize: 15, marginBottom: 12, boxSizing: "border-box"
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "12px 0", background: loading ? "#2a4a8a" : "#4f46e5", color: "#fff",
              border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
          {error && <p style={{ color: "#ff6b6b", fontSize: 13, marginTop: 12 }}>{error}</p>}
          <p style={{ color: "#555", fontSize: 12, marginTop: 20 }}>
            <a href="/" style={{ color: "#4f8ef7" }}>← Back to landing page</a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#888" }}>Loading…</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
