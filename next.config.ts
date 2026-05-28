import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App 100% estática → exportable a Cloudflare Workers Static Assets.
  output: "export",
};

export default nextConfig;
