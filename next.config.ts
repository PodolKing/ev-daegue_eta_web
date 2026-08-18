import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/** Dev HMR/fonts from phone on 172.30.1.0/24 (DHCP IP may change). */
const LAN_172_30_1 = Array.from(
  { length: 254 },
  (_, i) => `172.30.1.${i + 1}`,
);

const webRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: [...LAN_172_30_1, "172.28.16.1"],
  // 상위 워크스페이스 node_modules 때문에 Turbopack 루트가 흔들리면
  // React Client Manifest에서 map/page.tsx를 못 찾는다.
  turbopack: {
    root: webRoot,
  },
};

export default nextConfig;
