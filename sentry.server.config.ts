/**
 * Sentry configuration — server (Node.js)
 *
 * Env var required:
 *   NEXT_PUBLIC_SENTRY_DSN = https://xxx@oyyy.ingest.sentry.io/zzz
 *   SENTRY_AUTH_TOKEN      = (for source map upload in CI)
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    release:     process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",

    // Sampling — low on server to keep quota
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

    // Tag all errors with product context
    initialScope: {
      tags: {
        hypothesis_window: "48h",
        phase:             "mvp-2",
        runtime:           "server",
      },
    },

    // Ignore transient infra noise
    ignoreErrors: [
      "ECONNRESET",
      "ETIMEDOUT",
      "ECONNREFUSED",
    ],
  });
}
