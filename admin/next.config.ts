import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: "/tus-admin", // Tüm uygulama /tus-admin altına taşınır
  // assetPrefix'i kaldırın veya sadece çok özel CDN durumlarında kullanın
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;