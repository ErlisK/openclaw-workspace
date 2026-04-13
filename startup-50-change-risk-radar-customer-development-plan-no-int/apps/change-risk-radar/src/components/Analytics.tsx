"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

function getOrCreateSession(): string {
  if (typeof window === "undefined") return "";
  const key = "crr_sid";
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

function getVariant(): string {
  if (typeof document === "undefined") return "A";
  return document.cookie.match(/ab_pricing=([AB])/)?.[1] || "A";
}

export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    const sid = getOrCreateSession();
    if (!sid) return;

    const variant = getVariant();
    const referrer = document.referrer || null;

    // Fire pageview tracking
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "pageview",
        session_id: sid,
        path: pathname,
        referrer,
        variant,
      }),
      keepalive: true,
    }).catch(() => {});

    // Also track as ab_event for funnel analysis
    fetch("/api/ab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "pageview", variant }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
