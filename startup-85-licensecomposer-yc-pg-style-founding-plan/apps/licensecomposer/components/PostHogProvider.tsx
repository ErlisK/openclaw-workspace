'use client';
/**
 * components/PostHogProvider.tsx
 * Wraps the app in PostHog analytics provider.
 * Auto-captures pageviews and enables manual event tracking.
 */
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect, ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Initialize PostHog on the client
function PostHogInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    if (posthog.__loaded) return;

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host:        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      ui_host:         'https://us.posthog.com',
      capture_pageview: false,  // We capture manually below
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
    });
  }, []);

  return null;
}

// Track pageviews on route change (App Router)
function PostHogPageview() {
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!posthog.__loaded) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export default function PostHogProvider({ children }: { children: ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <PostHogInit />
      <PostHogPageview />
      {children}
    </PHProvider>
  );
}
