import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // standalone: self-contained Node.js server with middleware, API routes,
  // WebSocket upgrades, and Server Actions. Required for desktop launcher.
  output: "standalone",
  // Dynamic routes (searchParams / headers) run Prisma at request time; tracing must ship SQLite.
  outputFileTracingIncludes: {
    "/*": ["./prisma/business.sqlite"],
  },
};

export default withNextIntl(nextConfig);
