import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: "/tus-admin",
  assetPrefix: "/tus-admin", // Statik dosyaların başına /tus-admin ekler
  typescript: {
    // !! TEHLİKELİ !!
    // Projenizde tip hataları olsa bile build alınmasını sağlar.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
