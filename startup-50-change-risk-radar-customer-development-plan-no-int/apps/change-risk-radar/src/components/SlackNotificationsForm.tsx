"use client";
/**
 * SlackNotificationsForm
 *
 * Session-aware Slack webhook settings form.
 * Calls /api/notifications/endpoints (GET/POST) and /api/notifications/test (POST).
 * Works with both session-cookie auth AND magic token auth (?token= appended to API calls).
 *
 * Props:
 *   token            — optional org magic token (from URL ?token=)
 *   orgName          — display name for messages
 *   initialUrl       — masked URL if already configured (e.g. "...abc12345")
 *   initialIsActive  — whether endpoint is active
 *   initialLastTestAt     — ISO timestamp of last test
 *   initialLastTestStatus — "ok" | "error" | null
 *   initialLastError      — error string if last test failed
 */
import { useState } from "react";

type MsgKind = "ok" | "err" | "info";
type MsgState = { type: MsgKind; text: string } | null;

interface Props {
  token?: string;
  orgName: string;
  initialUrl: string | null;
  initialIsActive: boolean;
  initialLastTestAt: string | null;
  initialLastTestStatus: string | null;
  initialLastError: string | null;
}

export default function SlackNotificationsForm({
  token,
  orgName,
  initialUrl,
  initialIsActive,
  initialLastTestAt,
  initialLastTestStatus,
  initialLastError,
}: Props) {
  const [webhookInput, setWebhookInput] = useState("");
  const [maskedUrl, setMaskedUrl] = useState<string | null>(initialUrl);
  const [isActive, setIsActive] = useState(initialIsActive);
  const [lastTestAt, setLastTestAt] = useState<string | null>(initialLastTestAt);
  const [lastTestStatus, setLastTestStatus] = useState<string | null>(
    initialLastTestStatus
  );
  const [lastError, setLastError] = useState<string | null>(initialLastError);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<MsgState>(null);

  function flash(type: MsgKind, text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 8000);
  }

  /** Build API URL with optional magic token */
  function apiUrl(path: string): string {
    if (token) return `${path}?token=${encodeURIComponent(token)}`;
    return path;
  }

  async function handleSave() {
    const url = webhookInput.trim();
    if (!url) {
      flash("err", "Please enter a webhook URL");
      return;
    }
    if (!url.startsWith("https://hooks.slack.com/services/")) {
      flash(
        "err",
        "URL must start with https://hooks.slack.com/services/ — use a Slack Incoming Webhook URL"
      );
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch(apiUrl("/api/notifications/endpoints"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "slack_webhook", url }),
      });
      const data = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        flash("err", (data.error as string) || "Save failed — please try again.");
        return;
      }

      flash("ok", "Webhook saved ✓ — click Test Send to verify it works");
      setWebhookInput("");
      setIsActive(true);

      // Re-fetch to get masked URL
      const getRes = await fetch(apiUrl("/api/notifications/endpoints"));
      if (getRes.ok) {
        const getData = (await getRes.json()) as { endpoints?: Array<{ url: string | null }> };
        const first = getData.endpoints?.[0];
        setMaskedUrl(first?.url ?? null);
      } else {
        // Optimistic: show end of URL
        setMaskedUrl(`...${url.slice(-8)}`);
      }
    } catch (err) {
      flash("err", `Network error: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setMsg({ type: "info", text: "Sending test message to Slack…" });

    try {
      const res = await fetch(apiUrl("/api/notifications/test"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "slack_webhook" }),
      });
      const data = (await res.json()) as Record<string, unknown>;

      if (data.ok) {
        flash(
          "ok",
          `Test sent ✓${data.latency_ms ? ` (${data.latency_ms}ms)` : ""} — check your Slack channel`
        );
        setLastTestAt(new Date().toISOString());
        setLastTestStatus("ok");
        setLastError(null);
      } else {
        const errText = (data.error as string) || "unknown error";
        flash("err", `Test failed: ${errText}`);
        setLastTestAt(new Date().toISOString());
        setLastTestStatus("error");
        setLastError(errText);
      }
    } catch (err) {
      flash("err", `Network error: ${String(err)}`);
    } finally {
      setTesting(false);
    }
  }

  const isConfigured = !!maskedUrl && isActive;

  return (
    <div
      className="card"
      style={{
        padding: "1.5rem",
        marginBottom: "1.5rem",
        borderColor: "rgba(74,144,226,0.3)",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontWeight: 800, fontSize: "1.1rem", margin: "0 0 0.3rem" }}>
          💬 Slack Notifications
        </h2>
        <p
          style={{
            fontSize: "0.82rem",
            color: "var(--muted)",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Get alerts posted to a Slack channel the moment a vendor change is
          detected.{" "}
          <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            How to create a Slack Incoming Webhook →
          </a>
        </p>
      </div>

      {/* Current status */}
      {isConfigured && (
        <div
          style={{
            padding: "0.6rem 1rem",
            borderRadius: 8,
            marginBottom: "1rem",
            background: "rgba(16,185,129,0.07)",
            border: "1px solid rgba(16,185,129,0.2)",
            fontSize: "0.8rem",
          }}
        >
          <span style={{ color: "#10b981", fontWeight: 700 }}>
            ✓ Webhook configured
          </span>
          {maskedUrl && (
            <span style={{ color: "var(--muted)", marginLeft: "0.5rem" }}>
              ·{" "}
              <code
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.78rem",
                  background: "rgba(255,255,255,0.06)",
                  padding: "1px 5px",
                  borderRadius: 3,
                }}
              >
                https://hooks.slack.com/services/{maskedUrl}
              </code>
            </span>
          )}
          {lastTestAt && (
            <span style={{ color: "var(--muted)", marginLeft: "0.5rem" }}>
              · Last test:{" "}
              <span
                style={{
                  color: lastTestStatus === "ok" ? "#10b981" : "#ef4444",
                  fontWeight: 600,
                }}
              >
                {lastTestStatus === "ok" ? "✓ passed" : "✗ failed"}
              </span>{" "}
              <span style={{ fontSize: "0.72rem" }}>
                ({new Date(lastTestAt).toLocaleString()})
              </span>
            </span>
          )}
          {lastError && lastTestStatus !== "ok" && (
            <div
              style={{
                color: "#ef4444",
                fontSize: "0.72rem",
                marginTop: "0.3rem",
              }}
            >
              ⚠ {lastError.slice(0, 120)}
            </div>
          )}
        </div>
      )}

      {/* Feedback message / toast */}
      {msg && (
        <div
          style={{
            padding: "0.6rem 1rem",
            borderRadius: 8,
            marginBottom: "0.75rem",
            fontSize: "0.8rem",
            border: "1px solid currentColor",
            background:
              msg.type === "ok"
                ? "rgba(16,185,129,0.1)"
                : msg.type === "err"
                ? "rgba(239,68,68,0.1)"
                : "rgba(245,158,11,0.1)",
            color:
              msg.type === "ok"
                ? "#10b981"
                : msg.type === "err"
                ? "#ef4444"
                : "#f59e0b",
          }}
        >
          {msg.text}
        </div>
      )}

      {/* Input row */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "stretch",
          flexWrap: "wrap",
        }}
      >
        <input
          type="url"
          value={webhookInput}
          onChange={(e) => setWebhookInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="https://hooks.slack.com/services/T.../B.../..."
          aria-label="Slack Incoming Webhook URL"
          style={{
            flex: 1,
            minWidth: 260,
            padding: "0.6rem 0.85rem",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--foreground)",
            fontSize: "0.82rem",
            fontFamily: "monospace",
          }}
        />
        <button
          onClick={handleSave}
          disabled={saving || !webhookInput.trim()}
          className="btn-primary"
          style={{
            fontSize: "0.82rem",
            opacity: saving || !webhookInput.trim() ? 0.55 : 1,
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {isConfigured && (
          <button
            onClick={handleTest}
            disabled={testing}
            className="btn-ghost"
            style={{ fontSize: "0.82rem" }}
          >
            {testing ? "Sending…" : "Test Send"}
          </button>
        )}
      </div>

      {/* Help text */}
      <p
        style={{
          fontSize: "0.72rem",
          color: "var(--muted)",
          margin: "0.5rem 0 0",
          lineHeight: 1.6,
        }}
      >
        Paste a{" "}
        <a
          href="https://api.slack.com/messaging/webhooks"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--accent)" }}
        >
          Slack Incoming Webhook URL
        </a>{" "}
        — it must start with{" "}
        <code style={{ fontFamily: "monospace", fontSize: "0.7rem" }}>
          https://hooks.slack.com/services/
        </code>
        . After saving, click <strong>Test Send</strong> to confirm delivery
        {orgName ? ` to ${orgName}` : ""}.{" "}
        <strong>
          Webhook URLs are never displayed in full or logged server-side.
        </strong>
      </p>
    </div>
  );
}
