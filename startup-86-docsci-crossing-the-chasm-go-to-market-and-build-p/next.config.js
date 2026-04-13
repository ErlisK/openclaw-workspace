/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_URL: "https://snippetci.com",
  },
  // Allow native Node.js modules (isolated-vm) in server-side API routes
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle isolated-vm — it's a native module and must be required at runtime
      config.externals = [...(config.externals || []), "isolated-vm", "pyodide"];
    }
    return config;
  },
};
module.exports = nextConfig;
