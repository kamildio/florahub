import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  ...(process.env.MAXIFLORA_RUNTIME === 'node' ? {
    output: 'standalone' as const,
    distDir: '.next-node',
    serverExternalPackages: ['mysql2'],
    webpack(config: any) {
      config.resolve.alias['#platform-runtime'] = path.resolve('server/node-runtime.mjs');
      return config;
    },
  } : {}),
};

export default nextConfig;
