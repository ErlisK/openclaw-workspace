import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'mammoth', '@aws-sdk/client-bedrock-runtime'],
}

export default nextConfig
