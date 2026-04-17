import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: process.env.NEXT_PUBLIC_EXPORT === "true" ? "export" : undefined,
};

export default withNextIntl(nextConfig);
