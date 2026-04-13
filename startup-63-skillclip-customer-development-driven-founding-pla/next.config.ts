import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["certclip.com", "*.vercel.app"],
    },
  },
  images: {
    domains: ["qifxwrixwjgnitjsncxs.supabase.co"],
  },
};

export default nextConfig;
