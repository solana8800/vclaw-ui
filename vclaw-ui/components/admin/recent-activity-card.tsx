import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecentOrderActivity } from "@/lib/commerce/report-stats";

function formatMoney(amount: number, locale: string) {
  return `${amount.toLocaleString(locale === "en" ? "en-US" : "vi-VN")} đ`;
}

function formatTime(iso: string, locale: string) {
  const d = new Date(iso);
  return d.toLocaleString(locale === "en" ? "en-US" : "vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RecentActivityCard({
  title,
  empty,
  orders,
  locale,
}: {
  title: string;
  empty: string;
  orders: RecentOrderActivity[];
  locale: string;
}) {
  return (
    <Card className="flex h-full flex-col overflow-hidden border-[color:var(--line)] bg-[color:var(--surface)] shadow-[0_20px_50px_-40px_var(--shadow-color)]">
      <CardHeader className="border-b border-[color:var(--line)] bg-[color:var(--surface-soft)]/50 pb-3">
        <CardTitle className="text-lg font-semibold text-[color:var(--foreground-strong)]">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 overflow-y-auto p-4">
        {orders.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)] text-center py-8">{empty}</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li
                key={o.id}
                className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-3 text-sm transition-colors duration-200 hover:border-[color:var(--brand-soft)]"
              >
                <div className="font-semibold text-[color:var(--foreground-strong)]">
                  {o.orderNumber}
                  <span className="ml-2 text-xs font-normal text-[color:var(--muted)]">
                    {o.customerName}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
                  <span className="rounded-md bg-[color:var(--brand-softer)] px-2 py-0.5 font-medium text-[color:var(--brand-strong)]">
                    {o.status}
                  </span>
                  <span>{formatMoney(o.amount, locale)}</span>
                  <span>· {formatTime(o.updatedAt, locale)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
