"use client";

import { useState, FormEvent } from "react";
import React from "react";

function getUtm() {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  return {
    source: p.get("utm_source") || undefined,
    medium: p.get("utm_medium") || undefined,
    campaign: p.get("utm_campaign") || undefined,
    term: p.get("utm_term") || undefined,
    content: p.get("utm_content") || undefined,
  };
}

export default function LeadForm() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    organization: "",
    use_case: "",
    needs_compliance_review: false,
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, utm: getUtm() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok)
        throw new Error(typeof data.error === "string" ? data.error : "Failed to submit");
      setStatus("success");
      fetch("/api/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "form_submit",
          pathname: window.location.pathname,
          utm: getUtm(),
        }),
      }).catch(() => {});
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An error occurred");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "3rem 2rem",
          background: "white",
          borderRadius: 12,
          border: "1px solid #d1fae5",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
        <h3 style={{ color: "#059669", marginBottom: "0.5rem" }}>You&apos;re on the list!</h3>
        <p style={{ color: "#64748b" }}>
          We&apos;ll reach out when early access opens. Stay tuned at{" "}
          <a href="https://citebundle.com" style={{ color: "#4f46e5" }}>
            citebundle.com
          </a>
          .
        </p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: "1rem",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontWeight: 600,
    marginBottom: "0.4rem",
    color: "#374151",
    fontSize: "0.9rem",
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "white",
        borderRadius: 12,
        padding: "2rem",
        border: "1px solid #e0e7ff",
        boxShadow: "0 4px 20px rgba(79,70,229,0.08)",
      }}
    >
      <div style={{ marginBottom: "1.25rem" }}>
        <label style={labelStyle}>Full Name *</label>
        <input
          style={inputStyle}
          type="text"
          required
          value={form.full_name}
          onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          placeholder="Dr. Jane Smith"
        />
      </div>
      <div style={{ marginBottom: "1.25rem" }}>
        <label style={labelStyle}>Email *</label>
        <input
          style={inputStyle}
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="jane@university.edu"
        />
      </div>
      <div style={{ marginBottom: "1.25rem" }}>
        <label style={labelStyle}>Organization</label>
        <input
          style={inputStyle}
          type="text"
          value={form.organization}
          onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
          placeholder="University / Hospital / Media Org"
        />
      </div>
      <div style={{ marginBottom: "1.25rem" }}>
        <label style={labelStyle}>Primary Use Case</label>
        <select
          style={inputStyle}
          value={form.use_case}
          onChange={(e) => setForm((f) => ({ ...f, use_case: e.target.value }))}
        >
          <option value="">Select one…</option>
          <option value="science_journalism">Science Journalism</option>
          <option value="health_marketing">Health &amp; Pharma Marketing</option>
          <option value="academic_outreach">Academic Public Outreach</option>
          <option value="compliance_content">Compliance Content Review</option>
          <option value="medical_education">Medical Education</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.75rem",
        }}
      >
        <input
          type="checkbox"
          id="compliance"
          checked={form.needs_compliance_review}
          onChange={(e) =>
            setForm((f) => ({ ...f, needs_compliance_review: e.target.checked }))
          }
          style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }}
        />
        <label
          htmlFor="compliance"
          style={{ color: "#374151", fontSize: "0.9rem", cursor: "pointer", lineHeight: 1.5 }}
        >
          I need compliance review features (pharma/regulatory/MLR workflow)
        </label>
      </div>
      {status === "error" && (
        <p style={{ color: "#ef4444", marginBottom: "1rem", fontSize: "0.875rem" }}>
          {errorMsg}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        style={{
          width: "100%",
          padding: "0.875rem",
          background: status === "loading" ? "#a5b4fc" : "#4f46e5",
          color: "white",
          border: "none",
          borderRadius: 8,
          fontSize: "1rem",
          fontWeight: 700,
          cursor: status === "loading" ? "not-allowed" : "pointer",
        }}
      >
        {status === "loading" ? "Submitting…" : "Request Early Access →"}
      </button>
      <p
        style={{
          textAlign: "center",
          fontSize: "0.75rem",
          color: "#9ca3af",
          marginTop: "1rem",
        }}
      >
        No spam. Unsubscribe anytime. hello@citebundle.com
      </p>
    </form>
  );
}
