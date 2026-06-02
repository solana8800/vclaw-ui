import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Khong external hoa `ws`: Next/Turbopack co the tao package hash `ws-...`
  // khong ton tai trong ban desktop standalone tren Windows.
  serverExternalPackages: ["bufferutil", "utf-8-validate", "pdf-parse"],
  // standalone: self-contained Node.js server with proxy (i18n), API routes,
  // WebSocket upgrades, and Server Actions. Required for desktop launcher.
  output: "standalone",
  // Dynamic routes (searchParams / headers) run Prisma at request time; tracing must ship SQLite.
  outputFileTracingIncludes: {
    "/*": ["./prisma/business.sqlite", "./docs/**/*.md"],
  },
  outputFileTracingExcludes: {
    "/*": ["**/*.ts", "**/*.tsx", "**/*.map", "**/.env*"],
  },
};

export default withNextIntl(nextConfig);
