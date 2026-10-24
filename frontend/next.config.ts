import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const origin = process.env.BACKEND_ORIGIN || "http://127.0.0.1:3001";
    return ["auth", "account", "staff", "admin", "products"].map((area) => ({
      source: `/api/v1/${area}/:path*`, destination: `${origin}/api/v1/${area}/:path*`,
    }));
  },
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
