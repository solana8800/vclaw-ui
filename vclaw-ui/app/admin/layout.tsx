import type { ReactNode } from "react";

import { LocaleShell } from "@/components/app/locale-shell";

/** Đồng bộ với `[locale]/admin`: không SSG khi build nếu thiếu DB. */
export const dynamic = "force-dynamic";

export default function DefaultAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <LocaleShell locale="vi">{children}</LocaleShell>;
}
