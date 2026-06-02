import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";

import { defaultTheme, themeInitScript } from "@/lib/ui";
import { FirebaseAnalytics } from "@/components/app/firebase-analytics";

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
        <Toaster richColors position="top-center" />
        {children}
        <Analytics />
        <FirebaseAnalytics />
      </body>
    </html>
  );
}
