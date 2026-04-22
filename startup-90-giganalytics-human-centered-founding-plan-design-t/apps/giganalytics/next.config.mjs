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
          // CSP is set dynamically per-request in middleware.ts (nonce-based)
          // to avoid 'unsafe-inline' — see middleware.ts for the full policy.
        ],
      },
    ];
  },
};

export default nextConfig;
