import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove the X-Powered-By header to reduce response size and avoid fingerprinting
  poweredByHeader: false,

  // Tree-shake large packages so only the code actually imported gets bundled
  experimental: {
    optimizePackageImports: ["date-fns", "clsx", "cheerio"],
  },
};

export default nextConfig;
