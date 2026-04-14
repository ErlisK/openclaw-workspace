"use client";
/**
 * PostHog client-side provider.
 * Wrap the app with this to enable page view tracking and feature flags.
 * NEXT_PUBLIC_POSTHOG_KEY must be set in Vercel env for production.
 * Falls back gracefully to no-op when not configured.
 */
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    // Lazy-load posthog-js only when key is available
    import("posthog-js").then(({ default: posthog }) => {
      if (!posthog.__loaded) {
        posthog.init(key, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
          capture_pageview: false, // manual below
          capture_pageleave: true,
          persistence: "localStorage",
          autocapture: false,
        });
      }
      posthog.capture("$pageview", {
        $current_url: window.location.href,
        path: pathname,
      });
    }).catch(() => {
      // posthog-js load failed — graceful no-op
    });
  }, [pathname, searchParams]);

  return <>{children}</>;
}

/**
 * Client-side event capture helper.
 * Also sends to /api/events for Supabase storage.
 */
export function trackEvent(event: string, properties?: Record<string, unknown>) {
  // Best-effort PostHog capture
  try {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (key) {
      import("posthog-js").then(({ default: posthog }) => {
        posthog.capture(event, properties);
      }).catch(() => {});
    }
  } catch { /* */ }

  // Also send to our own event ingestion endpoint
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, properties }),
  }).catch(() => {});
}
