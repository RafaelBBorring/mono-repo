/** @type {import('next').NextConfig} */
const path = require("path");

const isStaticExport = process.env.NEXT_OUTPUT === "export";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  output: isStaticExport ? "export" : "standalone",
  compress: true,
  poweredByHeader: false,
  trailingSlash: isStaticExport,
  basePath: isStaticExport && basePath ? basePath : undefined,
  assetPrefix: isStaticExport && basePath ? basePath : undefined,
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ["@supabase/supabase-js"],
  experimental: {
    outputFileTracingRoot: path.join(__dirname),
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
