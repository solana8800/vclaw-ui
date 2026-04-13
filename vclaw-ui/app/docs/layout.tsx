import type { ReactNode } from "react";

import { LocaleShell } from "@/components/app/locale-shell";

export default function DefaultDocsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <LocaleShell locale="vi">{children}</LocaleShell>;
}
