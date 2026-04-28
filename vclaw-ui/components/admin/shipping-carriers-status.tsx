import Link from "next/link";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/shared";
import { getAdminPath } from "@/lib/admin/content";
import type { AppLocale } from "@/i18n/routing";

type CarrierTone = "live" | "partial" | "off" | "planned";

function toneClass(tone: CarrierTone) {
  switch (tone) {
    case "live":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200";
    case "partial":
      return "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100";
    case "off":
      return "border-[color:var(--line)] bg-[color:var(--surface-soft)] text-[color:var(--muted)]";
    case "planned":
    default:
      return "border-[color:var(--line)] bg-transparent text-[color:var(--muted)]";
  }
}

export async function ShippingCarriersStatus({
  locale,
  ghtkLive,
  ghtkPartial,
  ghnConfigured,
}: {
  locale: AppLocale;
  ghtkLive: boolean;
  ghtkPartial: boolean;
  ghnConfigured: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "admin.shipping.carriers" });

  const ghtkTone: CarrierTone = ghtkLive ? "live" : ghtkPartial ? "partial" : "off";
  const ghtkBadge = ghtkLive
    ? t("statusLive")
    : ghtkPartial
      ? t("statusPartial")
      : t("statusNotConfigured");

  const ghnTone: CarrierTone = ghnConfigured ? "live" : "off";
  const ghnBadge = ghnConfigured ? t("statusLive") : t("statusNotConfigured");

  const rows: Array<{
    key: string;
    title: string;
    subtitle: string;
    badge: string;
    tone: CarrierTone;
  }> = [
    {
      key: "ghtk",
      title: t("ghtk.title"),
      subtitle: t("ghtk.subtitle"),
      badge: ghtkBadge,
      tone: ghtkTone,
    },
    {
      key: "ghn",
      title: t("ghn.title"),
      subtitle: t("ghn.subtitle"),
      badge: ghnBadge,
      tone: ghnTone,
    },
    {
      key: "viettel",
      title: t("viettel.title"),
      subtitle: t("viettel.subtitle"),
      badge: t("statusPlanned"),
      tone: "planned",
    },
  ];

  const settingsHref = getAdminPath(locale, "/admin/settings");
  const guideHref = getAdminPath(locale, "/admin/guide");

  return (
    <Card className="border-[color:var(--line)] shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
        <p className="text-xs text-[color:var(--muted)] pt-1">
          <Link
            href={settingsHref}
            className="font-medium text-[color:var(--brand)] underline-offset-2 hover:underline"
          >
            {t("linkSettings")}
          </Link>
          {" · "}
          <Link
            href={guideHref}
            className="font-medium text-[color:var(--brand)] underline-offset-2 hover:underline"
          >
            {t("linkGuide")}
          </Link>
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((item) => (
          <div
            key={item.key}
            className="flex flex-col gap-2 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-4 transition-colors duration-200 hover:border-[color:var(--brand-soft)] md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="font-medium text-[color:var(--foreground-strong)]">{item.title}</div>
              <div className="mt-1 text-sm text-[color:var(--muted)]">{item.subtitle}</div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 font-medium normal-case tracking-normal",
                toneClass(item.tone),
              )}
            >
              {item.badge}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
