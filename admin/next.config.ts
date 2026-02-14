import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    // !! TEHLİKELİ !!
    // Projenizde tip hataları olsa bile build alınmasını sağlar.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
