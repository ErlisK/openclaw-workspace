import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lpxhxmpzqjygsaawkrva.supabase.co' },
    ],
  },
};

export default nextConfig;
