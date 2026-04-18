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
};

module.exports = nextConfig;
