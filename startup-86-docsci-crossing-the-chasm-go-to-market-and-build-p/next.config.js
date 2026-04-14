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
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://api.posthog.com https://*.supabase.co; frame-ancestors 'none'" },
        ],
      },
    ]
  },
};
module.exports = nextConfig;
