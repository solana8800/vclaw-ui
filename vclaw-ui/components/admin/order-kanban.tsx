"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, GripVertical, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createOrder, updateOrderStatus } from "@/lib/commerce/orders";
import { cn } from "@/lib/shared";

export interface OrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  amount: number;
  status: string;
}

export type OrderCustomerOption = { id: string; name: string };

export function OrderKanban({
  initialOrders,
  customers,
  messages,
}: {
  initialOrders: OrderItem[];
  customers: OrderCustomerOption[];
  messages: Record<string, string | undefined> & {
    waitPay?: string;
    paid?: string;
    processing?: string;
    done?: string;
    followUp?: string;
    total?: string;
    addOrder?: string;
    createTitle?: string;
    customer?: string;
    amount?: string;
    status?: string;
    createSubmit?: string;
    moveStatus?: string;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [createStatus, setCreateStatus] = useState("PENDING");

  const columns: { id: string; title: string; color: string }[] = [
    { id: "PENDING", title: messages?.waitPay || "Chờ thanh toán", color: "bg-amber-500" },
    { id: "PAID", title: messages?.paid || "Đã thanh toán", color: "bg-blue-500" },
    { id: "PROCESSING", title: messages?.processing || "Đang xử lý", color: "bg-indigo-500" },
    { id: "DONE", title: messages?.done || "Hoàn tất", color: "bg-green-500" },
    { id: "FOLLOW_UP", title: messages?.followUp || "Follow-up", color: "bg-rose-500" },
  ];

  const statusOptions = ["PENDING", "PAID", "PROCESSING", "DONE", "FOLLOW_UP"];

  const handleStatusChange = (orderId: string, newStatus: string) => {
    startTransition(async () => {
      try {
        await updateOrderStatus(orderId, newStatus);
        router.refresh();
      } catch (error) {
        console.error("Lỗi khi cập nhật trạng thái đơn hàng:", error);
      }
    });
  };

  const handleCreate = () => {
    const normalized = amount.replace(/\./g, "").replace(/,/g, "").trim();
    const n = Number(normalized);
    if (!customerId || !Number.isFinite(n) || n <= 0) return;
    startTransition(async () => {
      try {
        await createOrder({
          customerId,
          amount: n,
          status: createStatus,
        });
        setShowCreate(false);
        setAmount("");
        router.refresh();
      } catch (e) {
        console.error(e);
      }
    });
  };

  return (
    <div className="mt-6 space-y-4">
      {showCreate ? (
        <Card className="border-[color:var(--brand-soft)]">
          <CardContent className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="sm:col-span-2">
              <div className="text-xs font-semibold text-[color:var(--muted)] mb-1">
                {messages.createTitle || "Tạo đơn mới"}
              </div>
              <label className="text-[10px] uppercase text-[color:var(--muted)]">
                {messages.customer || "Khách"}
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                {customers.length === 0 ? (
                  <option value="">—</option>
                ) : (
                  customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase text-[color:var(--muted)]">
                {messages.amount || "Số tiền (VNĐ)"}
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm"
                placeholder="150000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-[color:var(--muted)]">
                {messages.status || "Trạng thái"}
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm"
                value={createStatus}
                onChange={(e) => setCreateStatus(e.target.value)}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>
                Hủy
              </Button>
              <Button
                size="sm"
                className="rounded-xl"
                onClick={handleCreate}
                disabled={isPending || !customerId}
              >
                {messages.createSubmit || "Tạo đơn"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
        {columns.map((col) => {
          const colOrders = initialOrders.filter((o) => o.status === col.id);

          return (
            <div
              key={col.id}
              className="min-w-[280px] flex-1 flex flex-col bg-[color:var(--surface-soft)] rounded-xl border border-[color:var(--line)] overflow-hidden snap-center"
            >
              <div className={`h-1.5 w-full ${col.color}`} />
              <div className="p-3 bg-[color:var(--surface)] border-b border-[color:var(--line)] flex justify-between items-center">
                <h3 className="font-semibold text-sm text-[color:var(--foreground-strong)]">{col.title}</h3>
                <Badge
                  variant="outline"
                  className="bg-[color:var(--surface-strong)] text-[color:var(--muted)] hover:bg-[color:var(--surface-strong)]"
                >
                  {colOrders.length}
                </Badge>
              </div>

              <div className="p-3 flex-1 flex flex-col gap-3 h-full min-h-[400px]">
                {colOrders.map((order) => (
                  <Card
                    key={order.id}
                    className={cn(
                      "hover:border-[color:var(--brand-soft)] transition-colors group",
                      isPending ? "opacity-70 pointer-events-none" : "",
                    )}
                  >
                    <CardContent className="p-3 flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-[color:var(--muted)] opacity-30 mt-1" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[color:var(--brand-strong)]">
                            #{order.orderNumber}
                          </span>
                        </div>
                        <div className="font-medium text-sm text-[color:var(--foreground-strong)]">
                          {order.customerName}
                        </div>
                        <div className="text-xs text-[color:var(--muted)] flex justify-between">
                          <span>{messages?.total || "Tổng cộng"}</span>
                          <strong className="text-[color:var(--foreground)]">
                            {order.amount.toLocaleString()} đ
                          </strong>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-[color:var(--muted)]">
                            {messages.moveStatus || "Chuyển trạng thái"}
                          </label>
                          <select
                            className="w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] px-2 py-1.5 text-xs"
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            disabled={isPending}
                          >
                            {statusOptions.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {colOrders.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[color:var(--line)] rounded-lg text-center opacity-50 py-8">
                    <CheckCircle2 className="h-6 w-6 text-[color:var(--muted)] mb-2" />
                    <span className="text-xs text-[color:var(--muted)]">Trống</span>
                  </div>
                )}
              </div>

              <div className="p-2 border-t border-[color:var(--line)] bg-[color:var(--surface)]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-[color:var(--muted)] flex gap-1 h-8"
                  onClick={() => {
                    setShowCreate(true);
                    if (!customerId && customers[0]) setCustomerId(customers[0].id);
                  }}
                >
                  <Plus className="h-3 w-3" />
                  {messages?.addOrder || "Thêm đơn hàng"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
