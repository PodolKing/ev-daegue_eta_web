import type { NextConfig } from "next";

/** Dev HMR/fonts from phone on 172.30.1.0/24 (DHCP IP may change). */
const LAN_172_30_1 = Array.from(
  { length: 254 },
  (_, i) => `172.30.1.${i + 1}`,
);

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: [...LAN_172_30_1, "172.28.16.1"],
};

export default nextConfig;
