"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateOrderShipping } from "@/lib/commerce/orders";

type OrderShippingRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  shippingNote: string | null;
  shippingEstimate: number | null;
};

export function ShippingOrderNotes({
  initialOrders,
  messages,
}: {
  initialOrders: OrderShippingRow[];
  messages: {
    title: string;
    order: string;
    note: string;
    estimate: string;
    save: string;
    empty: string;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Record<string, { note: string; estimate: string }>>(() =>
    Object.fromEntries(
      initialOrders.map((o) => [
        o.id,
        {
          note: o.shippingNote ?? "",
          estimate:
            o.shippingEstimate !== null && o.shippingEstimate !== undefined
              ? String(o.shippingEstimate)
              : "",
        },
      ]),
    ),
  );

  const save = (id: string) => {
    const d = draft[id];
    if (!d) return;
    const est = d.estimate.trim() === "" ? null : Number(d.estimate.replace(/,/g, ""));
    startTransition(async () => {
      await updateOrderShipping(id, {
        shippingNote: d.note.trim() || null,
        shippingEstimate: est !== null && Number.isFinite(est) ? est : null,
      });
      router.refresh();
    });
  };

  return (
    <Card className="border-[color:var(--line)]">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4 text-[color:var(--brand)]" />
          {messages.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {initialOrders.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">{messages.empty}</p>
        ) : (
          initialOrders.map((o) => {
            const d = draft[o.id] ?? { note: "", estimate: "" };
            return (
              <div
                key={o.id}
                className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 space-y-2"
              >
                <div className="text-sm font-semibold text-[color:var(--foreground-strong)]">
                  {messages.order}: #{o.orderNumber} · {o.customerName}
                </div>
                <label className="text-[10px] uppercase text-[color:var(--muted)]">{messages.note}</label>
                <textarea
                  className="w-full min-h-[72px] rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-2 text-sm"
                  value={d.note}
                  disabled={isPending}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [o.id]: { ...d, note: e.target.value },
                    }))}
                />
                <label className="text-[10px] uppercase text-[color:var(--muted)]">{messages.estimate}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-2 text-sm"
                  placeholder="35000"
                  value={d.estimate}
                  disabled={isPending}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [o.id]: { ...d, estimate: e.target.value },
                    }))}
                />
                <Button size="sm" variant="outline" disabled={isPending} onClick={() => save(o.id)}>
                  {messages.save}
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
