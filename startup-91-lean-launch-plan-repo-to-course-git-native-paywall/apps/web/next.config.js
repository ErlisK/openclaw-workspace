/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during production builds — run separately in CI
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Fail on TS errors
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.githubusercontent.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  async redirects() {
    return [
      // /docs/payments -> /docs/payments-affiliates (301 permanent)
      { source: '/docs/payments', destination: '/docs/payments-affiliates', permanent: false },
      // /courses -> /marketplace
      { source: '/courses', destination: '/marketplace', permanent: true },
      // /auth/reset-password -> /auth/forgot-password (canonical forgot-password page)
      { source: '/auth/reset-password', destination: '/auth/forgot-password', permanent: true },
      // /dashboard/import -> /dashboard/new (old path redirect)
      { source: '/dashboard/import', destination: '/dashboard/new', permanent: true },
      // Note: /pricing is NOT redirected — the /pricing page is served directly
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // CORS headers are handled dynamically in middleware.ts — NOT set statically here
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://app.posthog.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://app.posthog.com",
              "frame-src https://js.stripe.com https://codesandbox.io https://stackblitz.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
