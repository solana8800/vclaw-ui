import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // standalone: self-contained Node.js server with middleware, API routes,
  // WebSocket upgrades, and Server Actions. Required for desktop launcher.
  output: "standalone",
};

export default withNextIntl(nextConfig);
