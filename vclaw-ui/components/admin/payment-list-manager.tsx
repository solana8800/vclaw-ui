"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  CreditCard, Hash, User, Phone, CheckCircle2, Clock, XCircle,
  ArrowRight, AlertTriangle, ChevronDown, Image as ImageIcon, X,
} from "lucide-react";
import type { Payment, Order, Customer } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/shared";
import { updatePaymentFields } from "@/lib/actions/payment-actions";
import { PaymentDetailModal } from "./payment-detail-modal";

type PaymentWithOrder = Payment & {
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
  bill: string;
  dateCreated: string;
  statusPending: string;
  statusCompleted: string;
  statusFailed: string;
  statsPending: string;
  statsDone: string;
  statsFailed: string;
  statsCollected: string;
  modalChangeTitle: string;
  modalPaymentInfo: string;
  modalStatusChange: string;
  modalImpact: string;
  modalWarning: string;
  cancel: string;
  saving: string;
  confirmWithLabel: string;
  effect_PENDING_COMPLETED: string;
  effect_PENDING_FAILED: string;
  warning_PENDING_FAILED: string;
  effect_COMPLETED_PENDING: string;
  warning_COMPLETED_PENDING: string;
  effect_COMPLETED_FAILED: string;
  warning_COMPLETED_FAILED: string;
  effect_FAILED_PENDING: string;
  effect_FAILED_COMPLETED: string;
  warning_FAILED_COMPLETED: string;
};

type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED";

type PendingStatusChange = {
  payment: PaymentWithOrder;
  newStatus: PaymentStatus;
};

export function PaymentListManager({
  initialPayments,
  messages,
}: {
  initialPayments: PaymentWithOrder[];
  messages: Messages;
}) {
  const router = useRouter();
  const locale = useLocale();
  const dateLocale = locale === "en" ? "en-US" : "vi-VN";
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState(initialPayments);
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithOrder | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingStatusChange | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const applyStatusChange = (payment: PaymentWithOrder, newStatus: PaymentStatus) => {
    startTransition(async () => {
      await updatePaymentFields(payment.id, {
        status: newStatus,
        evidenceImage: payment.evidenceImage ?? null,
      });
      setRows((prev) =>
        prev.map((p) => p.id === payment.id ? { ...p, status: newStatus } : p)
      );
      setPendingChange(null);
      setOpenDropdown(null);
      router.refresh();
    });
  };

  const stats = {
    total: rows.length,
    pending: rows.filter(p => p.status === "PENDING").length,
    completed: rows.filter(p => p.status === "COMPLETED").length,
    failed: rows.filter(p => p.status === "FAILED").length,
    totalAmount: rows.filter(p => p.status === "COMPLETED").reduce((s, p) => s + p.amount, 0),
  };

  const STATUS_META: Record<
    PaymentStatus,
    { label: string; icon: React.ReactNode; color: string; badgeColor: string }
  > = useMemo(
    () => ({
      PENDING: {
        label: messages.statusPending,
        icon: <Clock className="h-3.5 w-3.5" />,
        color: "text-amber-600 bg-amber-500/10 border-amber-500/30",
        badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
      },
      COMPLETED: {
        label: messages.statusCompleted,
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30",
        badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
      },
      FAILED: {
        label: messages.statusFailed,
        icon: <XCircle className="h-3.5 w-3.5" />,
        color: "text-red-600 bg-red-500/10 border-red-500/30",
        badgeColor: "bg-red-100 text-red-700 border-red-200",
      },
    }),
    [messages.statusPending, messages.statusCompleted, messages.statusFailed],
  );

  const CHANGE_EFFECTS: Partial<Record<string, { effect: string; warning?: string }>> = useMemo(
    () => ({
      "PENDING→COMPLETED": { effect: messages.effect_PENDING_COMPLETED },
      "PENDING→FAILED": {
        effect: messages.effect_PENDING_FAILED,
        warning: messages.warning_PENDING_FAILED,
      },
      "COMPLETED→PENDING": {
        effect: messages.effect_COMPLETED_PENDING,
        warning: messages.warning_COMPLETED_PENDING,
      },
      "COMPLETED→FAILED": {
        effect: messages.effect_COMPLETED_FAILED,
        warning: messages.warning_COMPLETED_FAILED,
      },
      "FAILED→PENDING": { effect: messages.effect_FAILED_PENDING },
      "FAILED→COMPLETED": {
        effect: messages.effect_FAILED_COMPLETED,
        warning: messages.warning_FAILED_COMPLETED,
      },
    }),
    [messages],
  );

  return (
    <>
      <Card className="border-[color:var(--line)] shadow-sm">
        <CardHeader className="pb-3 border-b border-[color:var(--line)]">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-[color:var(--brand)]" />
              {messages.listTitle}
              <Badge variant="outline" className="text-xs">{stats.total}</Badge>
            </div>
            {/* Stats nhỏ */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-[color:var(--muted)]">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                {messages.statsPending.replace("{n}", String(stats.pending))}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {messages.statsDone.replace("{n}", String(stats.completed))}
              </span>
              {stats.failed > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  {messages.statsFailed.replace("{n}", String(stats.failed))}
                </span>
              )}
              <span className="pl-2 border-l border-[color:var(--line)] font-bold text-[color:var(--foreground-strong)]">
                {messages.statsCollected.replace(
                  "{amount}",
                  `${stats.totalAmount.toLocaleString(dateLocale)} đ`,
                )}
              </span>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="py-16 text-center space-y-2 opacity-40">
              <CreditCard className="h-10 w-10 mx-auto text-[color:var(--muted)]" />
              <p className="text-sm text-[color:var(--muted)]">{messages.empty}</p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[480px]">
              <table className="w-full text-sm">
                <thead className="bg-[color:var(--surface-soft)] sticky top-0 z-10">
                  <tr className="border-b border-[color:var(--line)]">
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">
                      {messages.order}
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">
                      {messages.customer}
                    </th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">
                      {messages.amount}
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)] hidden sm:table-cell">
                      {messages.method}
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">
                      {messages.status}
                    </th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)] hidden md:table-cell">
                      {messages.bill}
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)] hidden lg:table-cell">
                      {messages.dateCreated}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--line)]">
                  {rows.map((p) => {
                    const status = (p.status as PaymentStatus) in STATUS_META
                      ? (p.status as PaymentStatus)
                      : "PENDING";
                    const meta = STATUS_META[status];

                    return (
                      <tr
                        key={p.id}
                        className="group hover:bg-[color:var(--surface-soft)] transition-colors align-middle"
                      >
                        {/* Mã ĐH */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedPayment(p)}
                            className="font-mono text-xs font-bold text-[color:var(--brand-strong)] hover:underline flex items-center gap-1"
                          >
                            <Hash className="h-3 w-3" />
                            {p.order.orderNumber}
                          </button>
                          <div className="text-[10px] text-[color:var(--muted)] mt-0.5">
                            {new Date(p.createdAt).toLocaleDateString(dateLocale)}
                          </div>
                        </td>

                        {/* Khách hàng */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] flex items-center justify-center text-white font-black text-[10px] shrink-0">
                              {p.order.customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-[color:var(--foreground-strong)] truncate max-w-[120px]">
                                {p.order.customer.name}
                              </div>
                              {(p.order.customer as any).phone && (
                                <div className="text-[10px] text-[color:var(--muted)] flex items-center gap-0.5">
                                  <Phone className="h-2.5 w-2.5" />
                                  {(p.order.customer as any).phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Số tiền */}
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-bold text-[color:var(--foreground-strong)] whitespace-nowrap">
                            {p.amount.toLocaleString(dateLocale)} đ
                          </span>
                        </td>

                        {/* Phương thức */}
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {p.method}
                          </Badge>
                        </td>

                        {/* Trạng thái — click để đổi */}
                        <td className="px-4 py-3">
                          <div className="relative">
                            <button
                              onClick={() => setOpenDropdown(openDropdown === p.id ? null : p.id)}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all hover:shadow-sm",
                                meta.color
                              )}
                            >
                              {meta.icon}
                              {meta.label}
                              <ChevronDown className="h-3 w-3 opacity-60" />
                            </button>

                            {openDropdown === p.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                                <div className="absolute left-0 top-full mt-1 z-20 bg-[color:var(--surface)] border border-[color:var(--line)] rounded-xl shadow-xl overflow-hidden min-w-[180px] animate-in fade-in slide-in-from-top-2 duration-150">
                                  {(Object.keys(STATUS_META) as PaymentStatus[]).filter(s => s !== status).map((s) => {
                                    const sm = STATUS_META[s];
                                    return (
                                      <button
                                        key={s}
                                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold hover:bg-[color:var(--surface-soft)] transition-colors text-left"
                                        onClick={() => {
                                          setOpenDropdown(null);
                                          setPendingChange({ payment: p, newStatus: s });
                                        }}
                                      >
                                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px]", sm.color)}>
                                          {sm.icon} {sm.label}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Bill thumbnail */}
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          {p.evidenceImage ? (
                            <button onClick={() => setSelectedPayment(p)}>
                              <img
                                src={p.evidenceImage}
                                className="h-9 w-9 object-cover rounded-lg border border-[color:var(--line)] hover:border-[color:var(--brand)] hover:scale-110 transition-all"
                                alt="bill"
                              />
                            </button>
                          ) : (
                            <div className="h-9 w-9 mx-auto rounded-lg border border-dashed border-[color:var(--line)] flex items-center justify-center">
                              <ImageIcon className="h-3.5 w-3.5 text-[color:var(--muted)] opacity-40" />
                            </div>
                          )}
                        </td>

                        {/* Ngày tạo */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="text-xs text-[color:var(--muted)]">
                            {new Date(p.createdAt).toLocaleString(dateLocale, {
                              day: "2-digit", month: "2-digit",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </div>
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

      {/* Payment Detail Modal */}
      <PaymentDetailModal
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
      />

      {/* Confirm Status Change Dialog */}
      {pendingChange && (() => {
        const { payment, newStatus } = pendingChange;
        const fromStatus = (payment.status as PaymentStatus) in STATUS_META
          ? (payment.status as PaymentStatus) : "PENDING";
        const fromMeta = STATUS_META[fromStatus];
        const toMeta = STATUS_META[newStatus];
        const effectKey = `${fromStatus}→${newStatus}`;
        const effectInfo = CHANGE_EFFECTS[effectKey];

        return (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isPending && setPendingChange(null)}
          >
            <div
              className="bg-[color:var(--surface)] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[color:var(--line)] animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4 flex items-start gap-3">
                <div className="p-2.5 rounded-xl border text-sky-600 bg-sky-500/10 border-sky-500/20 shrink-0">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[color:var(--foreground-strong)]">{messages.modalChangeTitle}</h3>
                  <p className="text-xs text-[color:var(--muted)] mt-0.5 font-mono">#{payment.order.orderNumber}</p>
                </div>
                <button
                  type="button"
                  onClick={() => !isPending && setPendingChange(null)}
                  className="text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-6 space-y-4 pb-5">
                {/* Thông tin thanh toán */}
                <div className="rounded-xl bg-[color:var(--surface-soft)] border border-[color:var(--line)] px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[color:var(--foreground-strong)]">
                      {payment.order.customer.name}
                    </div>
                    <div className="text-[10px] text-[color:var(--muted)]">{payment.method}</div>
                  </div>
                  <div className="text-base font-black text-[color:var(--brand-strong)]">
                    {payment.amount.toLocaleString(dateLocale)} đ
                  </div>
                </div>

                {/* Trạng thái thay đổi */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">
                    {messages.modalStatusChange}
                  </p>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)]">
                    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold", fromMeta.color)}>
                      {fromMeta.icon} {fromMeta.label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-[color:var(--muted)] shrink-0" />
                    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold", toMeta.color)}>
                      {toMeta.icon} {toMeta.label}
                    </span>
                  </div>
                </div>

                {/* Giải thích tác động */}
                {effectInfo && (
                  <div className="rounded-xl bg-sky-500/5 border border-sky-500/20 px-4 py-3 space-y-2">
                    <p className="text-xs text-sky-700 leading-relaxed">{effectInfo.effect}</p>
                  </div>
                )}

                {/* Cảnh báo nếu có */}
                {effectInfo?.warning && (
                  <div className="flex items-start gap-2 rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 leading-relaxed">{effectInfo.warning}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-[color:var(--surface-soft)] border-t border-[color:var(--line)] flex justify-end gap-3">
                <Button
                  variant="outline"
                  className="rounded-xl px-5 h-10"
                  onClick={() => setPendingChange(null)}
                  disabled={isPending}
                >
                  {messages.cancel}
                </Button>
                <Button
                  className={cn(
                    "rounded-xl px-5 h-10 font-bold gap-2",
                    newStatus === "FAILED"
                      ? "bg-red-500 hover:bg-red-600 text-white border-none"
                      : newStatus === "COMPLETED"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                        : "bg-[image:var(--brand-gradient)] text-white"
                  )}
                  onClick={() => applyStatusChange(payment, newStatus)}
                  disabled={isPending}
                >
                  {isPending ? (
                    messages.saving
                  ) : (
                    <>
                      {toMeta.icon}{" "}
                      {messages.confirmWithLabel.replace("{label}", toMeta.label)}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
