"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { IntegrationOauthFlashKey } from "@/lib/integration-oauth-flash";
import { isIntegrationOauthFlashSuccess } from "@/lib/integration-oauth-flash";

export function IntegrationOauthBanner({
  flashKey,
  message,
  cleanHref,
}: {
  flashKey: IntegrationOauthFlashKey;
  message: string;
  cleanHref: string;
}) {
  const router = useRouter();
  const ok = isIntegrationOauthFlashSuccess(flashKey);

  useEffect(() => {
    const t = window.setTimeout(() => {
      router.replace(cleanHref, { scroll: false });
    }, 400);
    return () => window.clearTimeout(t);
  }, [cleanHref, router]);

  return (
    <div
      role="status"
      className={
        ok
          ? "mb-4 rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100"
          : "mb-4 rounded-lg border border-red-600/30 bg-red-500/10 px-3 py-2 text-sm text-red-900 dark:text-red-100"
      }
    >
      {message}
    </div>
  );
}
