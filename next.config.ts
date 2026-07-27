import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phone / LAN access to Next dev assets (HMR, fonts). Add PC LAN IP when it changes.
  allowedDevOrigins: ["172.30.1.7", "172.28.16.1"],
};

export default nextConfig;
