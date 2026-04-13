import type { NextConfig } from "next";

// NOTE: CSP with per-request nonce is set entirely in middleware.ts.
// next.config.ts only sets non-CSP security headers.

const SECURITY_HEADERS = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'off',  // L3 fix: disable DNS prefetch for privacy
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false, // L2 fix: hide X-Powered-By header
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
      {
        // Webhook endpoint — Stripe needs raw body
        source: '/api/webhooks/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
