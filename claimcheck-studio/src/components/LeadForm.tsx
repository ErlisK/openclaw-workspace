"use client";

import { useState, FormEvent } from "react";

interface FormState {
  name: string;
  email: string;
  company: string;
  role: string;
  use_case: string;
}

const ROLES = [
  "Medical Writer",
  "Medical Affairs / MSL",
  "Health/Science Media Editor",
  "Life-Science Marketing / Comms",
  "Researcher / Academic",
  "Other",
];

export default function LeadForm() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    company: "",
    role: "",
    use_case: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const getUtmParams = () => {
    if (typeof window === "undefined") return {};
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get("utm_source") || undefined,
      utm_medium: params.get("utm_medium") || undefined,
      utm_campaign: params.get("utm_campaign") || undefined,
      referrer: document.referrer || undefined,
    };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setErrorMsg("Name and email are required.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...getUtmParams() }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(typeof data.error === "string" ? data.error : "Submission failed. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div style={styles.successBox}>
        <div style={styles.successIcon}>✓</div>
        <h3 style={styles.successTitle}>You&apos;re on the list!</h3>
        <p style={styles.successText}>
          We&apos;ll reach out as early access opens. Keep an eye on{" "}
          <strong>{form.email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form} noValidate>
      <div style={styles.row}>
        <div style={styles.field}>
          <label htmlFor="name" style={styles.label}>
            Name <span style={styles.required}>*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            placeholder="Jane Smith"
            style={styles.input}
            required
          />
        </div>
        <div style={styles.field}>
          <label htmlFor="email" style={styles.label}>
            Work Email <span style={styles.required}>*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="jane@company.com"
            style={styles.input}
            required
          />
        </div>
      </div>
      <div style={styles.row}>
        <div style={styles.field}>
          <label htmlFor="company" style={styles.label}>Company</label>
          <input
            id="company"
            name="company"
            type="text"
            value={form.company}
            onChange={handleChange}
            placeholder="Acme Pharma"
            style={styles.input}
          />
        </div>
        <div style={styles.field}>
          <label htmlFor="role" style={styles.label}>Role</label>
          <select
            id="role"
            name="role"
            value={form.role}
            onChange={handleChange}
            style={{ ...styles.input, ...styles.select }}
          >
            <option value="">Select your role…</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={styles.field}>
        <label htmlFor="use_case" style={styles.label}>
          Intended use-case
        </label>
        <textarea
          id="use_case"
          name="use_case"
          value={form.use_case}
          onChange={handleChange}
          placeholder="e.g. Evidence-backed LinkedIn threads for our medical affairs team…"
          style={{ ...styles.input, ...styles.textarea }}
          rows={3}
        />
      </div>
      {errorMsg && <p style={styles.error}>{errorMsg}</p>}
      <button
        type="submit"
        disabled={status === "loading"}
        style={{
          ...styles.button,
          ...(status === "loading" ? styles.buttonDisabled : {}),
        }}
      >
        {status === "loading" ? "Submitting…" : "Request Early Access →"}
      </button>
      <p style={styles.privacy}>
        No spam. We&apos;ll only contact you about ClaimCheck Studio access.{" "}
        <a href="/privacy" style={styles.link}>Privacy Policy</a>
      </p>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    width: "100%",
    maxWidth: "640px",
    margin: "0 auto",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#1a1a2e",
  },
  required: {
    color: "#e63946",
  },
  input: {
    padding: "0.65rem 0.85rem",
    border: "1.5px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "0.95rem",
    color: "#1a1a2e",
    backgroundColor: "#fff",
    outline: "none",
    transition: "border-color 0.2s",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  select: {
    appearance: "none" as const,
    cursor: "pointer",
  },
  textarea: {
    resize: "vertical",
    fontFamily: "inherit",
  },
  button: {
    padding: "0.85rem 2rem",
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    transition: "background-color 0.2s",
    letterSpacing: "0.01em",
  },
  buttonDisabled: {
    backgroundColor: "#93c5fd",
    cursor: "not-allowed",
  },
  error: {
    color: "#dc2626",
    fontSize: "0.875rem",
    margin: 0,
  },
  privacy: {
    fontSize: "0.8rem",
    color: "#6b7280",
    textAlign: "center" as const,
    margin: 0,
  },
  link: {
    color: "#2563eb",
    textDecoration: "none",
  },
  successBox: {
    textAlign: "center" as const,
    padding: "2.5rem 2rem",
    background: "#f0fdf4",
    border: "1.5px solid #bbf7d0",
    borderRadius: "12px",
    maxWidth: "480px",
    margin: "0 auto",
  },
  successIcon: {
    fontSize: "2.5rem",
    color: "#16a34a",
    marginBottom: "0.75rem",
  },
  successTitle: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#15803d",
    margin: "0 0 0.5rem",
  },
  successText: {
    color: "#166534",
    fontSize: "0.95rem",
    margin: 0,
  },
};
