"use client";
/**
 * SlackWebhookPreviewForm
 *
 * A standalone, no-persistence Slack webhook test-send form.
 * The webhook URL is persisted client-side in localStorage only.
 * Sends to /api/notifications/test with { webhook_url, dry_run? }.
 *
 * Clearly communicates to the user that this is a preview —
 * secure server-side persistence is coming soon.
 */
import { useState, useEffect } from "react";

const STORAGE_KEY = "crr_preview_slack_webhook_url";

type MsgKind = "ok" | "err" | "info";
type MsgState = { type: MsgKind; text: string } | null;

export default function SlackWebhookPreviewForm() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [dryRun, setDryRun] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<MsgState>(null);
  const [responseDetail, setResponseDetail] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount (client-only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setWebhookUrl(saved);
    } catch {
      // localStorage not available
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage whenever URL changes
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (webhookUrl.trim()) {
        localStorage.setItem(STORAGE_KEY, webhookUrl.trim());
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [webhookUrl, hydrated]);

  function flash(type: MsgKind, text: string, detail?: string) {
    setMsg({ type, text });
    setResponseDetail(detail ?? null);
    if (type !== "info") {
      setTimeout(() => setMsg(null), 12000);
    }
  }

  async function handleTestSend() {
    const url = webhookUrl.trim();
    if (!url) {
      flash("err", "Please enter a Slack Incoming Webhook URL first.");
      return;
    }

    setSending(true);
    flash("info", dryRun ? "Running dry-run check…" : "Sending test message to Slack…");

    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhook_url: url,
          dry_run: dryRun,
        }),
      });

      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        flash("err", `Server returned non-JSON (HTTP ${res.status})`);
        return;
      }

      if (data.ok) {
        if (dryRun) {
          flash(
            "ok",
            "✓ Dry run passed — payload validated, no message sent.",
            JSON.stringify(data, null, 2),
          );
        } else {
          flash(
            "ok",
            "✓ Test message sent — check your Slack channel!",
            data.latency_ms ? `Round-trip: ${data.latency_ms}ms` : undefined,
          );
        }
      } else {
        const errMsg =
          (data.error as string) ||
          `HTTP ${res.status}: ${JSON.stringify(data)}`;
        flash("err", `Test failed: ${errMsg}`);
      }
    } catch (err) {
      flash("err", `Network error: ${String(err)}`);
    } finally {
      setSending(false);
    }
  }

  if (!hydrated) return null; // avoid hydration mismatch

  return (
    <div
      className="card"
      style={{
        padding: "1.5rem",
        marginBottom: "1.5rem",
        border: "1px solid rgba(99,102,241,0.35)",
        borderRadius: 10,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "1rem" }}>
        <div
          style={{
            display: "flex",
            gap: "0.6rem",
            alignItems: "center",
            marginBottom: "0.4rem",
          }}
        >
          <h2 style={{ fontWeight: 800, fontSize: "1.05rem", margin: 0 }}>
            💬 Slack — Test Send
          </h2>
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 20,
              background: "rgba(99,102,241,0.15)",
              color: "#818cf8",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
            }}
          >
            Preview
          </span>
        </div>
        <p
          style={{
            fontSize: "0.82rem",
            color: "var(--muted)",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Enter your{" "}
          <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            Slack Incoming Webhook URL
          </a>{" "}
          and send a test message to verify your setup.
        </p>
      </div>

      {/* Preview notice */}
      <div
        style={{
          padding: "0.65rem 1rem",
          marginBottom: "1rem",
          borderRadius: 8,
          background: "rgba(245,158,11,0.07)",
          border: "1px solid rgba(245,158,11,0.22)",
          fontSize: "0.78rem",
          color: "var(--muted)",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: "#f59e0b" }}>⚠ Preview mode</strong> —{" "}
        Your Slack webhook is <strong>not saved to our servers yet</strong>. It
        is stored in your browser only (localStorage). This lets you verify your
        webhook works before we add secure server-side persistence. We&apos;ll
        add that shortly.
      </div>

      {/* Input */}
      <div style={{ marginBottom: "0.75rem" }}>
        <label
          htmlFor="preview-webhook-url"
          style={{
            display: "block",
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "var(--muted)",
            marginBottom: "0.35rem",
          }}
        >
          Slack Incoming Webhook URL
        </label>
        <input
          id="preview-webhook-url"
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleTestSend()}
          placeholder="https://hooks.slack.com/services/T.../B.../..."
          aria-label="Slack Incoming Webhook URL"
          autoComplete="off"
          spellCheck={false}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "0.6rem 0.85rem",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--foreground)",
            fontSize: "0.82rem",
            fontFamily: "monospace",
          }}
        />
        <p
          style={{
            fontSize: "0.7rem",
            color: "var(--muted)",
            margin: "0.3rem 0 0",
          }}
        >
          Stored in <em>your browser only</em> — never sent to our servers
          except during the test POST.
        </p>
      </div>

      {/* Dry Run checkbox */}
      <label
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          marginBottom: "0.9rem",
          cursor: "pointer",
          fontSize: "0.82rem",
          color: "var(--muted)",
          userSelect: "none",
        }}
      >
        <input
          type="checkbox"
          checked={dryRun}
          onChange={(e) => setDryRun(e.target.checked)}
          style={{ width: 15, height: 15, cursor: "pointer" }}
        />
        <span>
          <strong style={{ color: "var(--foreground)" }}>Dry run</strong> —
          validate &amp; echo payload without sending to Slack
        </span>
      </label>

      {/* Action button */}
      <button
        onClick={handleTestSend}
        disabled={sending || !webhookUrl.trim()}
        className="btn-primary"
        style={{
          fontSize: "0.85rem",
          opacity: sending || !webhookUrl.trim() ? 0.55 : 1,
          cursor: sending ? "wait" : !webhookUrl.trim() ? "not-allowed" : "pointer",
        }}
      >
        {sending ? "Sending…" : dryRun ? "Dry Run Check" : "Test Send →"}
      </button>

      {/* Response message */}
      {msg && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.65rem 1rem",
            borderRadius: 8,
            fontSize: "0.8rem",
            border: "1px solid",
            background:
              msg.type === "ok"
                ? "rgba(16,185,129,0.09)"
                : msg.type === "err"
                  ? "rgba(239,68,68,0.09)"
                  : "rgba(245,158,11,0.09)",
            borderColor:
              msg.type === "ok"
                ? "rgba(16,185,129,0.3)"
                : msg.type === "err"
                  ? "rgba(239,68,68,0.3)"
                  : "rgba(245,158,11,0.3)",
            color:
              msg.type === "ok"
                ? "#10b981"
                : msg.type === "err"
                  ? "#ef4444"
                  : "#f59e0b",
          }}
        >
          <div style={{ fontWeight: 600 }}>{msg.text}</div>
          {responseDetail && (
            <pre
              style={{
                margin: "0.4rem 0 0",
                fontSize: "0.7rem",
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                color: "inherit",
                opacity: 0.8,
              }}
            >
              {responseDetail}
            </pre>
          )}
        </div>
      )}

      {/* Help text */}
      <p
        style={{
          fontSize: "0.72rem",
          color: "var(--muted)",
          margin: "0.75rem 0 0",
          lineHeight: 1.6,
        }}
      >
        Need a webhook?{" "}
        <a
          href="https://api.slack.com/messaging/webhooks"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--accent)" }}
        >
          Create a Slack Incoming Webhook →
        </a>{" "}
        · Webhook URLs starting with{" "}
        <code style={{ fontFamily: "monospace", fontSize: "0.68rem" }}>
          https://hooks.slack.com/services/
        </code>{" "}
        are required in production.
      </p>

      <p
        style={{
          fontSize: "0.72rem",
          color: "var(--muted)",
          margin: "0.4rem 0 0",
          lineHeight: 1.6,
        }}
      >
        Want secure server-side persistence?{" "}
        <a href="/settings/notifications" style={{ color: "var(--accent)" }}>
          Go to Settings → Notifications
        </a>{" "}
        after signing in — we&apos;ll add full persistence shortly.
      </p>
    </div>
  );
}
