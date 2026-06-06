import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/firebase-messaging-sw.js",
        destination: "/api/fcm/sw",
      },
    ]
  },
};

export default nextConfig;
