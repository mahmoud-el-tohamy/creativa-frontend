import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {},
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'development'
          ? 'http://localhost:5000/api/:path*'
          : 'https://creativa-backend.vercel.app/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: process.env.NODE_ENV === 'development'
          ? 'http://localhost:5000/uploads/:path*'
          : 'https://creativa-backend.vercel.app/uploads/:path*',
      },
    ]
  },
  // PERF: Add cache headers for static and API responses
  async headers() {
    return [
      {
        // Cache static assets aggressively
        source: "/(.*)\\.(ico|png|jpg|jpeg|svg|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // API responses: no cache (dynamic data)
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
