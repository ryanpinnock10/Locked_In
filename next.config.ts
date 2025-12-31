import type { NextConfig } from "next";
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: true, // Temporarily disabled for debugging
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
