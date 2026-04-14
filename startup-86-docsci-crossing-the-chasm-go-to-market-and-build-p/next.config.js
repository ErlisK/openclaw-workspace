/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow native Node.js modules (isolated-vm) in server-side API routes
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle isolated-vm — it's a native module and must be required at runtime
      config.externals = [...(config.externals || []), "isolated-vm", "pyodide"];
    }
    return config;
  },
  async headers() {
    const allowed = process.env.ALLOWED_ORIGINS?.split(',') ?? ['https://snippetci.com'];
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: allowed[0] || 'https://snippetci.com' },
          { key: 'Vary', value: 'Origin' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Admin-Key' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      // CSP is set dynamically by middleware.ts with nonce support
          // This static header is a fallback only (middleware takes precedence)
          { key: 'Content-Security-Policy', value: "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' blob:; worker-src blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://api.posthog.com https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'" },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
