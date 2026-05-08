import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // ws dùng native addon bufferutil; nếu webpack bundle sẽ phá vỡ fallback detection
  serverExternalPackages: ["ws", "bufferutil", "utf-8-validate"],
  // standalone: self-contained Node.js server with proxy (i18n), API routes,
  // WebSocket upgrades, and Server Actions. Required for desktop launcher.
  output: "standalone",
  // Dynamic routes (searchParams / headers) run Prisma at request time; tracing must ship SQLite.
  outputFileTracingIncludes: {
    "/*": ["./prisma/business.sqlite"],
  },
  outputFileTracingExcludes: {
    "/*": ["**/*.ts", "**/*.tsx", "**/*.map", "**/.env*", "**/*.md"],
  },
};

export default withNextIntl(nextConfig);
