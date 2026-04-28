import Link from "next/link";
import type { ShopSettings } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminPageContent } from "@/lib/admin/content";

type ShopSummaryMessages = NonNullable<AdminPageContent["shopSummary"]>;

export function SettingsShopSummary({
  settings,
  messages,
  editHref,
}: {
  settings: ShopSettings | null;
  messages: ShopSummaryMessages;
  editHref: string;
}) {
  const shopName = settings?.shopName?.trim() || messages.notSet;
  const channel = settings?.preferredChannel?.trim() || messages.notSet;

  return (
    <Card className="mb-6 border-[color:var(--line)] bg-[color:var(--surface-soft)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{messages.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-[color:var(--foreground-strong)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div>
              <span className="text-[color:var(--muted)]">{messages.shopNameLabel}: </span>
              <span className="font-medium">{shopName}</span>
            </div>
            <div>
              <span className="text-[color:var(--muted)]">{messages.channelLabel}: </span>
              <span className="font-medium">{channel}</span>
            </div>
            <div>
              <span className="text-[color:var(--muted)]">{messages.phoneLabel}: </span>
              <span className="font-medium">{settings?.phone || messages.notSet}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-[color:var(--muted)]">{messages.emailLabel}: </span>
              <span className="font-medium text-[color:var(--brand)]">{settings?.email || messages.notSet}</span>
            </div>
            <div>
              <span className="text-[color:var(--muted)]">{messages.addressLabel}: </span>
              <span className="font-medium">{settings?.address || messages.notSet}</span>
            </div>
          </div>
        </div>
        <Link
          href={editHref}
          className="inline-block pt-2 text-sm font-semibold text-[color:var(--brand)] underline-offset-2 hover:underline"
        >
          {messages.editCta}
        </Link>
      </CardContent>
    </Card>
  );
}
