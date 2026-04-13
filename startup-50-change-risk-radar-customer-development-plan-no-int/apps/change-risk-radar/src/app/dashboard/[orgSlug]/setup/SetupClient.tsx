"use client";

import { useState } from "react";
import type { OnboardingProgress, StepStatus } from "@/lib/onboarding";
import type { OnboardingStepId } from "@/lib/onboarding";

const STEP_ICONS: Record<OnboardingStepId, string> = {
  sign_up: "✅",
  connect_connector: "🔌",
  get_first_alert: "📡",
  react_to_alert: "💬",
  set_notifications: "🔔",
  invite_team: "👥",
  upgrade: "💳",
};

const CONNECTOR_TYPES = [
  { id: "stripe", name: "Stripe", icon: "💳", desc: "Pricing, webhooks, API changes" },
  { id: "aws", name: "AWS CloudTrail", icon: "☁️", desc: "IAM, security group, CloudTrail events" },
  { id: "workspace", name: "Google Workspace", icon: "🔵", desc: "Admin audit, user changes" },
  { id: "shopify", name: "Shopify", icon: "🛍️", desc: "App billing, webhook events" },
  { id: "salesforce", name: "Salesforce", icon: "☁️", desc: "Permission, sharing, critical updates" },
];

function fmt(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${(ms / 86_400_000).toFixed(1)}d`;
}

export default function SetupClient({
  orgId, orgName, orgSlug, token, progress: initialProgress,
}: {
  orgId: string;
  orgName: string;
  orgSlug: string;
  token: string;
  progress: OnboardingProgress;
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [expanded, setExpanded] = useState<OnboardingStepId | null>(
    initialProgress.current_step as OnboardingStepId
  );
  const [marking, setMarking] = useState<string | null>(null);

  const dash = (path = "") => `/dashboard/${orgSlug}${path}?token=${token}`;

  async function refreshProgress() {
    const res = await fetch(`/api/onboarding?token=${token}`);
    const d = await res.json() as { progress: OnboardingProgress };
    setProgress(d.progress);
  }

  async function markStep(stepId: OnboardingStepId) {
    setMarking(stepId);
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: stepId, token }),
    });
    await refreshProgress();
    setMarking(null);
  }

  const daysLeft = progress.trial_days_left;
  const isNearExpiry = daysLeft !== null && daysLeft <= 3;

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      {/* Nav */}
      <div style={{ borderBottom: "1px solid var(--border)", padding: "0.75rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>📡 {orgName}</div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <a href={dash()} className="btn-ghost" style={{ textDecoration: "none", fontSize: "0.75rem", padding: "0.4rem 0.85rem" }}>← Dashboard</a>
          <a href={dash("/billing")} className="btn-primary" style={{ textDecoration: "none", fontSize: "0.75rem", padding: "0.4rem 0.85rem" }}>Upgrade →</a>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem 4rem" }}>

        {/* Header + progress bar */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <div>
              <h1 style={{ fontWeight: 900, fontSize: "1.4rem", margin: "0 0 0.2rem" }}>Setup checklist</h1>
              <p style={{ color: "var(--muted)", fontSize: "0.82rem", margin: 0 }}>
                {progress.completed_count}/{progress.total_required} required steps completed
              </p>
            </div>
            {daysLeft !== null && (
              <div style={{
                padding: "0.4rem 0.9rem", borderRadius: 6,
                background: isNearExpiry ? "rgba(239,68,68,0.1)" : "rgba(99,102,241,0.1)",
                border: `1px solid ${isNearExpiry ? "rgba(239,68,68,0.25)" : "rgba(99,102,241,0.25)"}`,
                fontSize: "0.75rem", fontWeight: 700,
                color: isNearExpiry ? "#ef4444" : "var(--accent)",
              }}>
                {daysLeft === 0 ? "Trial expired" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ position: "relative", height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${progress.pct_complete}%`,
              background: progress.pct_complete === 100
                ? "linear-gradient(90deg,#10b981,#34d399)"
                : "linear-gradient(90deg,#6366f1,#818cf8)",
              borderRadius: 999, transition: "width 0.6s ease",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem", fontSize: "0.65rem", color: "var(--muted)" }}>
            <span>{progress.pct_complete}% complete</span>
            <span>Activation score: {progress.activation_score}/100</span>
          </div>
        </div>

        {/* TTV stats row (if any data) */}
        {(progress.ttv_connector_ms || progress.ttv_alert_ms) && (
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            {[
              { label: "Time to first connector", value: fmt(progress.ttv_connector_ms) },
              { label: "Time to first alert", value: fmt(progress.ttv_alert_ms) },
              { label: "Time to first reaction", value: fmt(progress.ttv_reaction_ms) },
            ].map(s => (
              <div key={s.label} className="tag" style={{ fontSize: "0.68rem", padding: "0.25rem 0.65rem" }}>
                {s.label}: <strong style={{ marginLeft: 4 }}>{s.value}</strong>
              </div>
            ))}
          </div>
        )}

        {/* Checklist steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {progress.steps.map((status: StepStatus) => {
            const { step } = status;
            const isExpanded = expanded === step.id;
            const isCurrent = progress.current_step === step.id;

            return (
              <div key={step.id}
                className="card"
                style={{
                  padding: "1rem 1.25rem",
                  borderLeft: `4px solid ${status.completed ? "#10b981" : isCurrent ? "var(--accent)" : "rgba(255,255,255,0.08)"}`,
                  opacity: status.skipped ? 0.5 : 1,
                  cursor: "pointer",
                }}
                onClick={() => setExpanded(isExpanded ? null : step.id as OnboardingStepId)}>

                {/* Step header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
                    {/* Completion circle */}
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: status.completed
                        ? "rgba(16,185,129,0.2)"
                        : isCurrent ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.06)",
                      border: `2px solid ${status.completed ? "#10b981" : isCurrent ? "var(--accent)" : "rgba(255,255,255,0.1)"}`,
                      fontSize: "0.75rem", fontWeight: 700,
                      color: status.completed ? "#10b981" : isCurrent ? "var(--accent)" : "var(--muted)",
                    }}>
                      {status.completed ? "✓" : step.order}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: isCurrent ? 800 : 600, fontSize: "0.88rem" }}>
                          {STEP_ICONS[step.id as OnboardingStepId]} {step.title}
                        </span>
                        {step.optional && (
                          <span className="tag" style={{ fontSize: "0.58rem", padding: "1px 6px" }}>Optional</span>
                        )}
                        {isCurrent && !status.completed && (
                          <span style={{ fontSize: "0.6rem", fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: "rgba(99,102,241,0.2)", color: "var(--accent)" }}>
                            NEXT
                          </span>
                        )}
                      </div>
                      {status.completed && status.completed_at && (
                        <div style={{ fontSize: "0.65rem", color: "#10b981", marginTop: 2 }}>
                          Completed {new Date(status.completed_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <span style={{ color: "var(--muted)", fontSize: "0.7rem", flexShrink: 0 }}>{isExpanded ? "▲" : "▼"}</span>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ marginTop: "0.85rem", paddingLeft: "2.5rem" }} onClick={e => e.stopPropagation()}>
                    <p style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.6, margin: "0 0 0.85rem" }}>
                      {step.description}
                    </p>

                    {/* Connector picker for connect_connector step */}
                    {step.id === "connect_connector" && !status.completed && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.85rem" }}>
                        {CONNECTOR_TYPES.map(c => (
                          <a key={c.id}
                            href={`${dash("/connect")}#${c.id}`}
                            style={{
                              textDecoration: "none", padding: "0.5rem 0.85rem", borderRadius: 8,
                              border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)",
                              display: "flex", alignItems: "center", gap: "0.4rem",
                            }}>
                            <span>{c.icon}</span>
                            <div>
                              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--foreground)" }}>{c.name}</div>
                              <div style={{ fontSize: "0.62rem", color: "var(--muted)" }}>{c.desc}</div>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Action row */}
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      {!status.completed && (
                        <>
                          <a
                            href={
                              step.action_url_key === "connect" ? dash("/connect") :
                              step.action_url_key === "billing" ? dash("/billing") :
                              step.action_url_key === "notifications" ? dash("/notifications") :
                              dash()
                            }
                            className="btn-primary"
                            style={{ textDecoration: "none", fontSize: "0.78rem", padding: "0.45rem 1rem" }}>
                            {step.action_label}
                          </a>
                          {["invite_team", "set_notifications"].includes(step.id) && (
                            <button
                              onClick={() => markStep(step.id as OnboardingStepId)}
                              disabled={marking === step.id}
                              className="btn-ghost"
                              style={{ fontSize: "0.72rem", cursor: "pointer", padding: "0.4rem 0.85rem" }}>
                              {marking === step.id ? "Saving…" : "Mark as done"}
                            </button>
                          )}
                        </>
                      )}
                      {status.completed && (
                        <span style={{ color: "#10b981", fontSize: "0.78rem", fontWeight: 700 }}>
                          ✓ Complete
                          {step.id !== "sign_up" && (
                            <a href={
                              step.action_url_key === "connect" ? dash("/connect") :
                              step.action_url_key === "billing" ? dash("/billing") :
                              dash()
                            } style={{ color: "var(--muted)", marginLeft: 8, fontSize: "0.7rem", textDecoration: "none" }}>
                              View →
                            </a>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA: upgrade */}
        {progress.is_complete && !progress.steps.find(s => s.step.id === "upgrade")?.completed && (
          <div style={{
            marginTop: "1.5rem", padding: "1.5rem", borderRadius: 10,
            background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08))",
            border: "1px solid rgba(99,102,241,0.25)", textAlign: "center",
          }}>
            <div style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "0.4rem" }}>
              🎉 Setup complete — you&apos;re getting full value
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: "1rem" }}>
              Upgrade to keep your connectors active and alert history beyond your trial.
            </p>
            <a href={dash("/billing")} className="btn-primary" style={{ textDecoration: "none", fontSize: "0.85rem", padding: "0.6rem 1.5rem" }}>
              View plans →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
