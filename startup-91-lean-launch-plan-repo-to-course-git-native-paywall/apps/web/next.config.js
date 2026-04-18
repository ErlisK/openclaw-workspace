/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.githubusercontent.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  // Ensure workspace packages are transpiled
  transpilePackages: ['@teachrepo/ui', '@teachrepo/core', '@teachrepo/quiz-engine', '@teachrepo/types'],
};

module.exports = nextConfig;
