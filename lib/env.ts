/**
 * Environment variable validation
 * Run at app startup (in layout.tsx or root page).
 * Logs warnings for missing optional vars; throws for required ones.
 *
 * Design: all env vars are optional — the app degrades gracefully.
 * This module tells you clearly WHAT is missing and HOW to fix it.
 */

export type EnvStatus = {
  key: string;
  required: boolean;
  present: boolean;
  note: string;
};

const ENV_MANIFEST: Array<Omit<EnvStatus, "present">> = [
  // ── Supabase ──────────────────────────────────────────────────────────────
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    required: false,
    note: "Supabase project URL. Without it, app runs in localStorage-only mode.",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: false,
    note: "Supabase anon key (safe to expose). Without it, no cloud persistence.",
  },

  // ── PostHog ───────────────────────────────────────────────────────────────
  {
    key: "NEXT_PUBLIC_POSTHOG_KEY",
    required: false,
    note: "PostHog project API key. Without it, events stored in localStorage only.",
  },
  {
    key: "NEXT_PUBLIC_POSTHOG_HOST",
    required: false,
    note: "PostHog API host. Defaults to https://app.posthog.com.",
  },

  // ── Sentry ────────────────────────────────────────────────────────────────
  {
    key: "NEXT_PUBLIC_SENTRY_DSN",
    required: false,
    note: "Sentry project DSN. Without it, errors logged to console only (H3 risk).",
  },
];

/**
 * Check all env vars and return status for each.
 * Safe to call client-side (only NEXT_PUBLIC_ vars checked).
 */
export function checkEnv(): EnvStatus[] {
  return ENV_MANIFEST.map((entry) => ({
    ...entry,
    present: Boolean(
      typeof process !== "undefined"
        ? process.env[entry.key]
        : undefined
    ),
  }));
}

/**
 * Log env status to console (dev only).
 * Shows which integrations are active.
 */
export function logEnvStatus(): void {
  if (process.env.NODE_ENV !== "development") return;

  const statuses = checkEnv();
  const missing = statuses.filter((s) => !s.present);
  const present = statuses.filter((s) => s.present);

  if (present.length > 0) {
    console.info(
      "[env] Active integrations:",
      present.map((s) => s.key.replace("NEXT_PUBLIC_", "")).join(", ")
    );
  }

  if (missing.length > 0) {
    console.warn(
      "[env] Missing optional env vars — app running in degraded mode:"
    );
    missing.forEach((s) =>
      console.warn(`  ✗ ${s.key}: ${s.note}`)
    );
    console.warn(
      "[env] See .env.example for setup instructions."
    );
  }
}

/**
 * Get active integration flags (for runtime feature detection).
 */
export function getIntegrationFlags() {
  return {
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    posthog: Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY),
    sentry: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  };
}
