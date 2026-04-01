/**
 * Environment variable validation + Feature Flags
 *
 * Design principles:
 * - All vars are optional — app degrades gracefully with no env vars
 * - Feature flags read from env at runtime; no external service needed
 * - Flags are boolean coercion of NEXT_PUBLIC_ strings
 * - Centralised here so product decisions have a single edit point
 *
 * Adding a new flag:
 *   1. Add NEXT_PUBLIC_FLAG_NAME to .env.example with default value
 *   2. Add to getFeatureFlags() below
 *   3. Add to ENV_MANIFEST for dev logging
 *   4. Add to Vercel project env vars for staging/prod
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
    key:      "NEXT_PUBLIC_SUPABASE_URL",
    required: false,
    note:     "Supabase project URL. Without it, app runs in localStorage-only mode.",
  },
  {
    key:      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: false,
    note:     "Supabase anon key (safe to expose). Without it, no cloud persistence.",
  },

  // ── PostHog ───────────────────────────────────────────────────────────────
  {
    key:      "NEXT_PUBLIC_POSTHOG_KEY",
    required: false,
    note:     "PostHog project API key. Without it, events stored in localStorage only.",
  },
  {
    key:      "NEXT_PUBLIC_POSTHOG_HOST",
    required: false,
    note:     "PostHog API host. Defaults to https://app.posthog.com.",
  },

  // ── Sentry ────────────────────────────────────────────────────────────────
  {
    key:      "NEXT_PUBLIC_SENTRY_DSN",
    required: false,
    note:     "Sentry project DSN. Without it, errors logged to console only (H3 risk).",
  },

  // ── Feature Flags ─────────────────────────────────────────────────────────
  {
    key:      "NEXT_PUBLIC_FLAG_FOCUS_MODE_DEFAULT",
    required: false,
    note:     "Feature flag: Focus Mode on by default when user first opens app. '1'=on, '0'=off.",
  },
  {
    key:      "NEXT_PUBLIC_FLAG_TODAY_CAP",
    required: false,
    note:     "Feature flag: today task cap (default 3). Override for testing other limits.",
  },
  {
    key:      "NEXT_PUBLIC_FLAG_AUTH_ENABLED",
    required: false,
    note:     "Feature flag: show auth UI. '0'=hide auth (localStorage-only UX), '1'=show.",
  },
  {
    key:      "NEXT_PUBLIC_SEED_DATA",
    required: false,
    note:     "Staging/local: 'true' injects seed tasks on first visit (empty state).",
  },
];

// ── Env check ─────────────────────────────────────────────────────────────────

/**
 * Check all env vars and return status for each.
 * Safe to call client-side (only NEXT_PUBLIC_ vars checked).
 */
export function checkEnv(): EnvStatus[] {
  return ENV_MANIFEST.map((entry) => ({
    ...entry,
    present: Boolean(
      typeof process !== "undefined" ? process.env[entry.key] : undefined
    ),
  }));
}

/**
 * Log env status to console (dev only).
 */
export function logEnvStatus(): void {
  if (process.env.NODE_ENV !== "development") return;

  const statuses = checkEnv();
  const missing  = statuses.filter((s) => !s.present);
  const present  = statuses.filter((s) => s.present);

  if (present.length > 0) {
    console.info(
      "[env] Active integrations:",
      present.map((s) => s.key.replace("NEXT_PUBLIC_", "")).join(", ")
    );
  }
  if (missing.length > 0) {
    console.warn("[env] Missing optional env vars — app running in degraded mode:");
    missing.forEach((s) => console.warn(`  ✗ ${s.key}: ${s.note}`));
    console.warn("[env] See .env.example for setup instructions.");
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
    posthog:  Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY),
    sentry:   Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  };
}

// ── Feature Flags ─────────────────────────────────────────────────────────────

/**
 * Feature flags resolved from NEXT_PUBLIC_ env vars.
 *
 * All flags have safe defaults — the app works identically with no flags set.
 * Set flags per-environment in Vercel dashboard:
 *   Production:  NEXT_PUBLIC_FLAG_FOCUS_MODE_DEFAULT=0  (opt-in)
 *   Staging:     NEXT_PUBLIC_FLAG_FOCUS_MODE_DEFAULT=1  (always on for burn-in)
 *
 * Future: swap env-var resolution for a posthog feature flag call to enable
 * true A/B without redeploy (Phase 3 migration path).
 */
export type FeatureFlags = {
  /** Focus Mode on by default when app first opens. Default: false (opt-in). */
  focusModeDefault: boolean;

  /** Today task cap (integer). Default: 3. */
  todayCap: number;

  /** Show auth UI (magic-link form + sync button). Default: true. */
  authEnabled: boolean;

  /** Inject seed tasks on first load when localStorage is empty. Default: false. */
  seedData: boolean;
};

let _flags: FeatureFlags | null = null;

export function getFeatureFlags(): FeatureFlags {
  // Memoised — flags are static per page load (NEXT_PUBLIC_ baked at build)
  if (_flags) return _flags;

  const raw = {
    focusModeDefault: process.env.NEXT_PUBLIC_FLAG_FOCUS_MODE_DEFAULT,
    todayCap:         process.env.NEXT_PUBLIC_FLAG_TODAY_CAP,
    authEnabled:      process.env.NEXT_PUBLIC_FLAG_AUTH_ENABLED,
    seedData:         process.env.NEXT_PUBLIC_SEED_DATA,
  };

  _flags = {
    focusModeDefault: raw.focusModeDefault === "1" || raw.focusModeDefault === "true",
    todayCap:         raw.todayCap ? Math.max(1, Math.min(10, parseInt(raw.todayCap, 10))) : 3,
    authEnabled:      raw.authEnabled !== "0" && raw.authEnabled !== "false",
    seedData:         raw.seedData === "true" || raw.seedData === "1",
  };

  return _flags;
}

/** Reset flag cache (for testing). */
export function _resetFlagCache() { _flags = null; }
