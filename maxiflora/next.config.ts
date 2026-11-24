import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  poweredByHeader:false,
  async headers(){return [{source:'/:path*',headers:[
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
    {key:'Content-Security-Policy',value:"frame-ancestors 'none'; object-src 'none'; base-uri 'self'"}
  ]}]},
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
