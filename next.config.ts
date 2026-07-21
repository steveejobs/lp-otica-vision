import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { viewTransition: true },
  poweredByHeader: false,
  images: {
    localPatterns: [
      {
        pathname: "/media/**",
      },
      {
        pathname: "/api/catalogo/imagem/**",
      },
    ],
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

