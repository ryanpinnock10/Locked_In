import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16 enables Turbopack by default. An empty turbopack config opts in
  // cleanly and silences the "webpack config with no turbopack config" error.
  turbopack: {},
};

// PWA support is currently disabled. `next-pwa` injects a custom webpack config
// that conflicts with Next 16's default Turbopack build, so we only wrap the
// config when PWA is actually enabled. To re-enable PWA, set ENABLE_PWA=true
// (note: next-pwa may require a Turbopack-compatible alternative such as
// @ducanh2912/next-pwa or @serwist/next under Next 16).
const PWA_ENABLED = process.env.ENABLE_PWA === "true";

let exportedConfig: NextConfig = nextConfig;

if (PWA_ENABLED) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const withPWA = require("next-pwa")({
    dest: "public",
    register: true,
    skipWaiting: true,
  });
  exportedConfig = withPWA(nextConfig);
}

export default exportedConfig;
