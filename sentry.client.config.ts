/**
 * Sentry configuration — client (browser)
 *
 * Env var required (add to .env.local + Vercel dashboard):
 *   NEXT_PUBLIC_SENTRY_DSN = https://xxx@oyyy.ingest.sentry.io/zzz
 *
 * This file is loaded automatically by @sentry/nextjs instrumentation.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",

    // Sampling
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,      // Phase 2: enable with consent
    replaysOnErrorSampleRate: 0.1,

    // Ignore noisy browser errors
    ignoreErrors: [
      "ResizeObserver loop",
      "Non-Error promise rejection",
      "Load failed",
    ],

    // Tag all events with hypothesis context
    initialScope: {
      tags: {
        hypothesis_window: "48h",
        phase: "mvp-1",
      },
    },
  });
}
