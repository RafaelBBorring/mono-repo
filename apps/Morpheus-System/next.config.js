/** @type {import('next').NextConfig} */
const path = require("path");

const isStaticExport = process.env.NEXT_OUTPUT === "export";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

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
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
