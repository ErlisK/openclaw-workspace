'use client';

import { useEffect } from 'react';

/**
 * PostHogProvider
 *
 * Optional PostHog client-side initialization.
 * Renders nothing — only initializes posthog-js if NEXT_PUBLIC_POSTHOG_KEY is set.
 * Graceful no-op if the key is absent.
 *
 * Wrap your root layout with this provider to enable PostHog identity tracking:
 *
 *   <PostHogProvider userId={user?.id}>
 *     {children}
 *   </PostHogProvider>
 *
 * PostHog is NEVER used for event capture directly — all events go through
 * /api/events → track() → Supabase (primary) → PostHog (optional).
 * This provider is only for identify() calls and feature flags.
 */

interface PostHogProviderProps {
  userId?: string | null;
  userEmail?: string | null;
  children: React.ReactNode;
}

export function PostHogProvider({ userId, userEmail, children }: PostHogProviderProps) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return; // Graceful no-op

    // Dynamic import — posthog-js is only bundled when the key is present
    import('posthog-js').then(({ default: posthog }) => {
      if (!posthog.__loaded) {
        posthog.init(key, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
          capture_pageview: false,   // We manage pageviews manually
          capture_pageleave: false,
          persistence: 'localStorage',
        });
      }

      if (userId) {
        posthog.identify(userId, {
          email: userEmail ?? undefined,
        });
      } else {
        posthog.reset();
      }
    }).catch(() => {
      // PostHog is optional — never crash
    });
  }, [userId, userEmail]);

  // This component renders no DOM — it's a side-effect only provider
  return <>{children}</>;
}
