"use client";
/**
 * NotificationSetupBanner
 *
 * Dismissible banner shown when an org has 0 active notification endpoints.
 * Links to /settings/notifications?token=... to guide setup.
 *
 * Usage:
 *   <NotificationSetupBanner
 *     orgSlug={org.slug}
 *     token={token}
 *     activeEndpointCount={activeCount}
 *   />
 */

import { useState, useEffect, useCallback } from "react";

const DISMISS_KEY = "crr_notification_banner_dismissed_until";

interface Props {
  orgSlug: string;
  token: string;
  activeEndpointCount: number;
}

export default function NotificationSetupBanner({
  orgSlug,
  token,
  activeEndpointCount,
}: Props) {
  const [dismissed, setDismissed] = useState(true); // optimistic hide until localStorage checked

  useEffect(() => {
    try {
      const until = localStorage.getItem(DISMISS_KEY);
      if (until && Date.now() < parseInt(until, 10)) {
        setDismissed(true);
      } else {
        setDismissed(false);
      }
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      const sevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem(DISMISS_KEY, String(sevenDays));
    } catch {
      // ignore
    }
    setDismissed(true);
  }, []);

  if (dismissed || activeEndpointCount > 0) return null;

  return (
    <div
      style={{
        marginBottom: "1rem",
        padding: "0.7rem 1rem",
        background: "rgba(99,102,241,0.07)",
        border: "1px solid rgba(99,102,241,0.25)",
        borderRadius: 8,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "0.5rem",
        flexWrap: "wrap",
      }}
      role="alert"
      aria-label="Notification setup prompt"
    >
      <span style={{ fontSize: "0.78rem" }}>
        🔔{" "}
        <strong>Enable notifications in 2 minutes</strong> — get alerted when
        vendors change pricing, terms, or APIs.{" "}
        <a
          href={`/settings/notifications?token=${token}`}
          style={{ color: "var(--accent)", textDecoration: "underline" }}
        >
          Set up notifications →
        </a>
      </span>
      <button
        onClick={dismiss}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--muted)",
          fontSize: "0.78rem",
          padding: "0.2rem 0.4rem",
          lineHeight: 1,
        }}
        title="Dismiss for 7 days"
        aria-label="Dismiss banner"
      >
        ✕
      </button>
    </div>
  );
}
