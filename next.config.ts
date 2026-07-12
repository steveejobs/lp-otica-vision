import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "exame.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "classic.exame.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
