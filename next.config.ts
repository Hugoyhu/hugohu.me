import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Invoice PDFs are uploaded through a server action (default limit 1 MB).
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
