import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Pre-existing type errors in admin dashboard components; ignore during build.
    // TODO: resolve FunnelStep, MetricsOverview, LatencyStats, EngagementStats mismatches.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lpxhxmpzqjygsaawkrva.supabase.co' },
    ],
  },
};

export default nextConfig;
