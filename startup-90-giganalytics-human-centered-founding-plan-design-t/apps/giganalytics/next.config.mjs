/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    serverBodySizeLimit: '2mb',
  },
  async headers() {
    return [
      // Landing pages: CDN-cacheable, 5min fresh, 1hr stale-while-revalidate
      {
        source: '/(|signup|login|pricing|blog|demo|launch|social|about|terms|privacy|contact)',
        headers: [
          { key: 'Cache-Control', value: 's-maxage=300, stale-while-revalidate=3600' },
        ],
      },
      // Static sample files: long cache
      {
        source: '/samples/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://js.stripe.com https://app.posthog.com https://plausible.io",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://app.posthog.com https://plausible.io https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://app.posthog.com https://plausible.io",
              "frame-src https://js.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
