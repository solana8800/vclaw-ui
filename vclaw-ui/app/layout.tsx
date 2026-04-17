import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { defaultTheme, themeInitScript } from "@/lib/theme";

import "./globals.css";

export const metadata: Metadata = {
  title: "VClaw",
  description:
    "VClaw is a local-first operations and commerce assistant for small businesses in Vietnam.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const locale = "vi";

  return (
    <html lang={locale} className={defaultTheme} suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
