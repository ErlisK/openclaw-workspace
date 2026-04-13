"use client";

import { useEffect } from "react";

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

export default function Analytics() {
  useEffect(() => {
    fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "pageview",
        pathname: window.location.pathname,
        search: window.location.search,
        referrer: document.referrer,
        utm: getUtm(),
      }),
    }).catch(() => {});
  }, []);
  return null;
}
