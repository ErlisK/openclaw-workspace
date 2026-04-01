import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PWA & static asset headers
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [{ key: "Content-Type", value: "application/manifest+json" }],
      },
      {
        source: "/offline.html",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        // Immutable icons
        source: "/icons/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },

  // Expose app version to client
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? "0.1.0",
  },

  // Sentry — only apply when auth token present (skips in local dev without creds)
  // The withSentryConfig wrapper is opt-in to keep zero-config local builds working.
  // To enable source maps and release tracking, set SENTRY_AUTH_TOKEN in your env.
  // See: https://docs.sentry.io/platforms/javascript/guides/nextjs/
};

// Apply Sentry plugin only when SENTRY_AUTH_TOKEN is present
const withSentryConfig = async (): Promise<NextConfig> => {
  const token = process.env.SENTRY_AUTH_TOKEN;
  const dsn   = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!token || !dsn) return nextConfig;

  try {
    const { withSentryConfig: sentry } = await import("@sentry/nextjs");
    return sentry(nextConfig, {
      org:     process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT ?? "focusdo",
      silent:  true,
      widenClientFileUpload: true,
      // Source maps: upload only in CI
      sourcemaps: {
        disable: !process.env.CI,
      },
    });
  } catch {
    return nextConfig;
  }
};

export default withSentryConfig();
