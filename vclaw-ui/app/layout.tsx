import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
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
  const locale = await getLocale();

  return (
    <html lang={locale} className={defaultTheme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
