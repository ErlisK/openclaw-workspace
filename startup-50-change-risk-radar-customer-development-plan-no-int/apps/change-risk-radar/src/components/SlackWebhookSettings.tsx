"use client";
/**
 * SlackWebhookSettings
 *
 * A self-contained client component for saving and testing a Slack
 * Incoming Webhook URL stored in notification_endpoints.
 *
 * Props:
 *   token       — org magic token for API auth
 *   orgName     — display name for success messages
 *   initialEndpoint — pre-fetched endpoint row (config.webhook_url already masked)
 */
import { useState } from "react";

interface SlackEndpoint {
  id: string;
  config: { webhook_url?: string };
  is_active: boolean;
  last_test_at: string | null;
  last_test_status: string | null;
  last_error: string | null;
}

type MsgKind = "ok" | "err" | "info";
type MsgState = { type: MsgKind; text: string } | null;

export default function SlackWebhookSettings({
  token,
  orgName,
  initialEndpoint,
}: {
  token: string;
  orgName: string;
  initialEndpoint: SlackEndpoint | null;
}) {
  const [endpoint, setEndpoint] = useState<SlackEndpoint | null>(
    initialEndpoint
  );
  const [webhookInput, setWebhookInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<MsgState>(null);

  function flash(type: MsgKind, text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 6000);
  }

  async function handleSave() {
    const url = webhookInput.trim();
    if (!url) return;
    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch(
        `/api/notifications/slack-webhook?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ webhook_url: url }),
        }
      );
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        flash("err", (data.error as string) || "Save failed");
        return;
      }

      flash("ok", "Saved ✓ — click Test to verify delivery");
      setWebhookInput("");

      // Refresh to show masked URL
      const getRes = await fetch(
        `/api/notifications/slack-webhook?token=${encodeURIComponent(token)}`
      );
      const getData = await getRes.json() as Record<string, unknown>;
      setEndpoint((getData.endpoint as SlackEndpoint) ?? null);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setMsg({ type: "info", text: "Sending test message to Slack…" });

    try {
      const res = await fetch(
        `/api/notifications/test?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ use_notification_endpoints: true }),
        }
      );
      const data = await res.json() as Record<string, unknown>;

      if (data.ok) {
        flash(
          "ok",
          `Test sent ✓${data.latency_ms ? ` (${data.latency_ms}ms)` : ""} — check your Slack channel`
        );
        setEndpoint((prev) =>
          prev
            ? {
                ...prev,
                last_test_at: new Date().toISOString(),
                last_test_status: "ok",
                last_error: null,
              }
            : prev
        );
      } else {
        flash("err", `Test failed: ${(data.error as string) || "unknown error"}`);
        setEndpoint((prev) =>
          prev
            ? {
                ...prev,
                last_test_at: new Date().toISOString(),
                last_test_status: "error",
              }
            : prev
        );
      }
    } finally {
      setTesting(false);
    }
  }

  const maskedUrl = endpoint?.config?.webhook_url;

  return (
    <div
      className="card"
      style={{
        padding: "1.25rem",
        marginBottom: "1.5rem",
        borderColor: "rgba(74,144,226,0.25)",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "0.75rem" }}>
        <h3
          style={{ fontWeight: 800, fontSize: "1rem", margin: "0 0 0.2rem" }}
        >
          💬 Slack Notifications
        </h3>
        <p
          style={{
            fontSize: "0.78rem",
            color: "var(--muted)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Get alerts posted directly to a Slack channel.{" "}
          <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            Create an Incoming Webhook →
          </a>
        </p>
      </div>

      {/* Current endpoint status */}
      {endpoint && (
        <div
          style={{
            padding: "0.6rem 0.9rem",
            borderRadius: 6,
            marginBottom: "0.75rem",
            background: "rgba(16,185,129,0.07)",
            border: "1px solid rgba(16,185,129,0.2)",
            fontSize: "0.78rem",
          }}
        >
          <span style={{ color: "#10b981", fontWeight: 700 }}>✓ Configured</span>
          {maskedUrl && (
            <span style={{ color: "var(--muted)", marginLeft: "0.5rem" }}>
              Webhook:{" "}
              <code
                style={{
                  fontFamily: "monospace",
                  background: "rgba(255,255,255,0.05)",
                  padding: "0 4px",
                  borderRadius: 3,
                }}
              >
                {maskedUrl}
              </code>
            </span>
          )}
          {endpoint.last_test_at && (
            <span style={{ color: "var(--muted)", marginLeft: "0.5rem" }}>
              · Last test:{" "}
              <span
                style={{
                  color:
                    endpoint.last_test_status === "ok"
                      ? "#10b981"
                      : "#ef4444",
                }}
              >
                {endpoint.last_test_status === "ok" ? "✓ ok" : "✗ error"}
              </span>{" "}
              ({new Date(endpoint.last_test_at).toLocaleString()})
            </span>
          )}
          {endpoint.last_error && (
            <div
              style={{
                color: "#ef4444",
                fontSize: "0.72rem",
                marginTop: "0.25rem",
              }}
            >
              ⚠ {endpoint.last_error.slice(0, 100)}
            </div>
          )}
        </div>
      )}

      {/* Feedback message */}
      {msg && (
        <div
          style={{
            padding: "0.5rem 0.9rem",
            borderRadius: 6,
            marginBottom: "0.75rem",
            fontSize: "0.78rem",
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

      {/* Input + action buttons */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          value={webhookInput}
          onChange={(e) => setWebhookInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="https://hooks.slack.com/services/..."
          style={{
            flex: 1,
            minWidth: 260,
            padding: "0.55rem 0.75rem",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--foreground)",
            fontSize: "0.82rem",
            fontFamily: "monospace",
            boxSizing: "border-box",
          }}
        />
        <button
          onClick={handleSave}
          disabled={saving || !webhookInput.trim()}
          className="btn-primary"
          style={{
            fontSize: "0.8rem",
            opacity: saving || !webhookInput.trim() ? 0.6 : 1,
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {endpoint && (
          <button
            onClick={handleTest}
            disabled={testing}
            className="btn-ghost"
            style={{ fontSize: "0.8rem" }}
          >
            {testing ? "Sending…" : "Test"}
          </button>
        )}
      </div>

      <p
        style={{
          fontSize: "0.7rem",
          color: "var(--muted)",
          margin: "0.4rem 0 0",
          lineHeight: 1.5,
        }}
      >
        Use a Slack Incoming Webhook URL (starts with{" "}
        <code style={{ fontFamily: "monospace" }}>
          https://hooks.slack.com/…
        </code>
        ). Paste your URL and click <strong>Save</strong>, then{" "}
        <strong>Test</strong> to confirm delivery to{" "}
        <em>{orgName}</em>.
      </p>
    </div>
  );
}
