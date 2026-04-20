"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Payment, Order, Customer } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updatePaymentFields } from "@/lib/actions/payment-actions";

export type PaymentWithOrder = Payment & {
  order: Order & { customer: Customer };
};

type Messages = {
  listTitle: string;
  order: string;
  customer: string;
  amount: string;
  method: string;
  status: string;
  evidence: string;
  save: string;
  empty: string;
};

const STATUSES = ["PENDING", "COMPLETED", "FAILED"] as const;

export function PaymentListManager({
  initialPayments,
  messages,
}: {
  initialPayments: PaymentWithOrder[];
  messages: Messages;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState(initialPayments);
  const [draft, setDraft] = useState<Record<string, { status: string; evidenceImage: string }>>(
    () =>
      Object.fromEntries(
        initialPayments.map((p) => [
          p.id,
          { status: p.status, evidenceImage: p.evidenceImage ?? "" },
        ]),
      ),
  );

  const saveRow = (id: string) => {
    const d = draft[id];
    if (!d) return;
    startTransition(async () => {
      await updatePaymentFields(id, {
        status: d.status,
        evidenceImage: d.evidenceImage || null,
      });
      setRows((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: d.status,
                evidenceImage: d.evidenceImage || null,
              }
            : p,
        ),
      );
      router.refresh();
    });
  };

  return (
    <Card className="mt-6 border-[color:var(--line)]">
      <CardHeader className="pb-2 border-b border-[color:var(--line)]">
        <CardTitle className="text-base">{messages.listTitle}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="p-8 text-sm text-[color:var(--muted)] text-center">{messages.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--surface-soft)] text-left text-[10px] uppercase text-[color:var(--muted)]">
                <tr>
                  <th className="px-3 py-2">{messages.order}</th>
                  <th className="px-3 py-2">{messages.customer}</th>
                  <th className="px-3 py-2">{messages.amount}</th>
                  <th className="px-3 py-2">{messages.method}</th>
                  <th className="px-3 py-2">{messages.status}</th>
                  <th className="px-3 py-2 min-w-[180px]">{messages.evidence}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {rows.map((p) => {
                  const d = draft[p.id] ?? {
                    status: p.status,
                    evidenceImage: p.evidenceImage ?? "",
                  };
                  return (
                    <tr key={p.id} className="align-top">
                      <td className="px-3 py-2 font-mono text-xs">{p.order.orderNumber}</td>
                      <td className="px-3 py-2">{p.order.customer.name}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {p.amount.toLocaleString("vi-VN")} đ
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">{p.method}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] px-2 py-1 text-xs"
                          value={d.status}
                          disabled={isPending}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [p.id]: { ...d, status: e.target.value },
                            }))}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="w-full min-w-[160px] rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-2 py-1 text-xs"
                          placeholder="https://..."
                          value={d.evidenceImage}
                          disabled={isPending}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [p.id]: { ...d, evidenceImage: e.target.value },
                            }))}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          disabled={isPending}
                          onClick={() => saveRow(p.id)}
                        >
                          {messages.save}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
