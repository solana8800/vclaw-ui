
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Truck,
  Mail,
  Send,
  ExternalLink,
  Package,
  User,
  MapPin,
  FileText,
  Hash,
  X,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { updateOrderFulfillment, updateOrderShipping, type OrderWithCustomer } from "@/lib/commerce/orders";
import { notifyShipperZalo } from "@/lib/actions/shipping-actions";
import { GHN_URLS } from "@/lib/logistics/ghn-constants";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

type ConfirmAction =
  | { type: "email"; order: OrderWithCustomer }
  | { type: "shipper"; order: OrderWithCustomer };

export function ShippingList({
  orders,
  shipperGroupId,
}: {
  orders: OrderWithCustomer[];
  shipperGroupId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("admin.shipping.fulfillment");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { address: string; note: string; estimate: string; tracking: string }>
  >({});
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const openEdit = (order: OrderWithCustomer) => {
    setDrafts((prev) => ({
      ...prev,
      [order.id]: {
        address: order.shippingAddress || "",
        note: order.shippingNote || "",
        estimate: order.shippingEstimate ? String(order.shippingEstimate) : "",
        tracking: order.trackingNumber || "",
      },
    }));
    setEditingId(order.id);
  };

  const handleSaveNote = (id: string) => {
    const d = drafts[id];
    if (!d) return;
    const est = d.estimate.trim() === "" ? null : Number(d.estimate.replace(/,/g, ""));
    startTransition(async () => {
      await updateOrderShipping(id, {
        shippingAddress: d.address.trim() || null,
        shippingNote: d.note.trim() || null,
        shippingEstimate: est !== null && Number.isFinite(est) ? est : null,
        trackingNumber: d.tracking.trim() || null,
      });
      setEditingId(null);
      toast.success("Đã cập nhật thông tin giao hàng");
      router.refresh();
    });
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    const { type, order } = confirmAction;
    setConfirmAction(null);

    if (type === "email") {
      startTransition(async () => {
        await updateOrderFulfillment(order.id, "COMPLETED");
        toast.success(t("toastEmailSuccess"));
        router.refresh();
      });
    } else {
      if (!shipperGroupId) {
        toast.error(t("toastShipperNotConfigured"));
        return;
      }
      startTransition(async () => {
        toast.info(t("toastNotifyingShipper"));
        const res = await notifyShipperZalo(order, shipperGroupId);
        if (res.success) {
          toast.success(t("toastShipperSuccess"));
        } else {
          toast.error("Lỗi: " + (res.error || "Không gửi được tin nhắn"));
        }
      });
    }
  };

  return (
    <>
      <Card className="border-[color:var(--line)] shadow-xl bg-gradient-to-br from-[color:var(--surface)] to-[color:var(--surface-soft)]">
        <CardHeader className="border-b border-[color:var(--line)] pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <Package className="h-6 w-6 text-[color:var(--brand)]" />
              {t("title")}
            </CardTitle>
            <Badge
              variant="outline"
              className="bg-[color:var(--surface-strong)] text-[color:var(--brand)] border-[color:var(--brand-soft)]"
            >
              {t("pendingCount", { count: orders.length })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[color:var(--line)]">
            {orders.length === 0 ? (
              <div className="p-12 text-center text-[color:var(--muted)]">
                <Truck className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>{t("empty")}</p>
              </div>
            ) : (
              orders.map((order) => {
                const isEditing = editingId === order.id;
                const draft = drafts[order.id] || { address: "", note: "", estimate: "", tracking: "" };

                return (
                  <div
                    key={order.id}
                    className="p-4 hover:bg-[color:var(--surface-soft)]/50 transition-all group border-b border-[color:var(--line)] last:border-0"
                  >
                    <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                      {/* Order # + status dots */}
                      <div className="flex items-center gap-3 shrink-0 min-w-[140px]">
                        <div className="h-10 w-10 rounded-xl bg-[color:var(--brand-soft)]/10 flex items-center justify-center border border-[color:var(--brand-soft)]/20 shrink-0">
                          <Package className="h-5 w-5 text-[color:var(--brand)]" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-base font-bold text-[color:var(--foreground-strong)] tracking-tight">
                            #{order.orderNumber}
                          </span>
                          <div className="flex gap-1 items-center">
                            <div
                              className={`w-2 h-2 rounded-full ${order.status === "PAID" ? "bg-green-500" : "bg-yellow-500"}`}
                              title={order.status === "PAID" ? t("statusPaid") : t("statusPending")}
                            />
                            <div
                              className={`w-2 h-2 rounded-full ${order.fulfillmentType === "DIGITAL_EMAIL" ? "bg-blue-500" : "bg-orange-500"}`}
                              title={order.fulfillmentType === "DIGITAL_EMAIL" ? t("typeDigital") : t("typePhysical")}
                            />
                            {order.trackingNumber && (
                              <span className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded px-1 ml-1">
                                {order.trackingNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Customer + address */}
                      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                        <div className="flex items-center gap-2 truncate">
                          <User className="h-3.5 w-3.5 text-[color:var(--muted)] shrink-0" />
                          <span className="font-semibold text-sm truncate">
                            {order.customer?.name || "Khách chưa xác định"}
                          </span>
                          <span className="text-xs text-[color:var(--muted)] truncate">
                            {(order.customer as any)?.phone || "Không có SĐT"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 truncate text-[color:var(--muted)]">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs truncate italic">
                            {order.shippingAddress || order.shippingNote || t("noAddress")}
                          </span>
                        </div>
                      </div>

                      {/* Amount + estimate */}
                      <div className="flex items-center gap-4 shrink-0 px-4 md:border-l border-[color:var(--line)]">
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-[color:var(--muted)] leading-none mb-0.5">
                            {t("total")}
                          </p>
                          <p className="font-bold text-sm text-[color:var(--foreground-strong)]">
                            {order.amount.toLocaleString("vi-VN")}đ
                          </p>
                        </div>
                        {order.shippingEstimate && (
                          <div className="bg-orange-500/10 text-orange-600 px-2 py-1 rounded-lg border border-orange-500/20 text-[10px] font-bold shrink-0">
                            Ship: {order.shippingEstimate.toLocaleString("vi-VN")}đ
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        {order.fulfillmentType === "DIGITAL_EMAIL" ? (
                          <Button
                            size="sm"
                            className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-bold"
                            disabled={order.status !== "PAID" || isPending}
                            onClick={() => setConfirmAction({ type: "email", order })}
                          >
                            <Mail className="h-3.5 w-3.5 mr-1.5" />
                            Gửi Mail
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-8 px-2 rounded-lg text-xs font-bold ${isEditing ? "bg-[color:var(--brand-soft)]/20 text-[color:var(--brand)]" : "text-[color:var(--muted)] hover:text-[color:var(--brand)]"}`}
                              onClick={() => (isEditing ? setEditingId(null) : openEdit(order))}
                              title="Sửa thông tin giao hàng"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 rounded-lg text-orange-600 hover:bg-orange-50 text-xs font-bold"
                              onClick={() => window.open(GHN_URLS.PORTAL_CREATE, "_blank")}
                              title={t("actionCreateGhn")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 px-3 rounded-lg bg-[color:var(--brand)] hover:bg-[color:var(--brand-strong)] text-white text-xs font-bold shadow-sm"
                              disabled={
                                (order.status !== "PAID" &&
                                  order.shippingNote?.toLowerCase() !== "cod") ||
                                isPending
                              }
                              onClick={() => setConfirmAction({ type: "shipper", order })}
                            >
                              <Send className="h-3.5 w-3.5 mr-1.5" />
                              Báo Shipper
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Edit panel */}
                    {isEditing && (
                      <div className="mt-3 p-4 rounded-2xl border-2 border-[color:var(--brand-soft)] bg-[color:var(--surface)] space-y-3 shadow-lg animate-in slide-in-from-top-1 duration-200">
                        {/* Hint: original address from customer profile */}
                        {(order.customer as any)?.shippingAddress && (
                          <div className="flex items-start gap-1.5 text-[10px] text-[color:var(--muted)] bg-[color:var(--surface-soft)] rounded-lg px-3 py-2 border border-[color:var(--line)]">
                            <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                            <span>
                              <span className="font-bold uppercase mr-1">Địa chỉ hồ sơ khách:</span>
                              {(order.customer as any).shippingAddress}
                            </span>
                          </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                          {/* Shipping address */}
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-[color:var(--muted)] ml-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              Địa chỉ giao hàng
                            </label>
                            <textarea
                              className="w-full h-16 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-3 text-xs outline-none focus:ring-1 focus:ring-[color:var(--brand)]"
                              placeholder="Nhập địa chỉ chuẩn hóa để gửi GHN / Shipper..."
                              value={draft.address}
                              disabled={isPending}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: { ...draft, address: e.target.value },
                                }))
                              }
                            />
                          </div>

                          {/* Note + estimate + tracking */}
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold text-[color:var(--muted)] ml-1 flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                Ghi chú nội bộ
                              </label>
                              <Input
                                className="h-9 rounded-xl bg-[color:var(--surface-soft)] text-xs"
                                placeholder="Ghi chú cho shipper..."
                                value={draft.note}
                                disabled={isPending}
                                onChange={(e) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [order.id]: { ...draft, note: e.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-[color:var(--muted)] ml-1">
                                  Phí ship (đ)
                                </label>
                                <Input
                                  type="text"
                                  className="h-9 rounded-xl bg-[color:var(--surface-soft)] text-xs font-bold"
                                  placeholder="0"
                                  value={draft.estimate}
                                  disabled={isPending}
                                  onChange={(e) =>
                                    setDrafts((prev) => ({
                                      ...prev,
                                      [order.id]: { ...draft, estimate: e.target.value },
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-[color:var(--muted)] ml-1 flex items-center gap-1">
                                  <Hash className="h-3 w-3" />
                                  Mã vận đơn
                                </label>
                                <Input
                                  className="h-9 rounded-xl bg-[color:var(--surface-soft)] text-xs font-mono"
                                  placeholder="GHN123456789"
                                  value={draft.tracking}
                                  disabled={isPending}
                                  onChange={(e) =>
                                    setDrafts((prev) => ({
                                      ...prev,
                                      [order.id]: { ...draft, tracking: e.target.value },
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 rounded-lg text-xs"
                            disabled={isPending}
                            onClick={() => setEditingId(null)}
                          >
                            Hủy
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 rounded-lg bg-[color:var(--brand)] text-xs"
                            disabled={isPending}
                            onClick={() => handleSaveNote(order.id)}
                          >
                            {isPending ? "Đang lưu..." : "Lưu thông tin"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !isPending && setConfirmAction(null)}
        >
          <div
            className="bg-[color:var(--surface)] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[color:var(--line)] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-start gap-3">
              <div
                className={`p-2.5 rounded-xl border shrink-0 ${
                  confirmAction.type === "email"
                    ? "text-blue-600 bg-blue-500/10 border-blue-500/20"
                    : "text-[color:var(--brand)] bg-[color:var(--brand-soft)] border-[color:var(--brand-soft)]"
                }`}
              >
                {confirmAction.type === "email" ? (
                  <Mail className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[color:var(--foreground-strong)]">
                  {confirmAction.type === "email"
                    ? "Xác nhận gửi vé / tài liệu điện tử"
                    : "Xác nhận báo Shipper qua Zalo"}
                </h3>
                <p className="text-xs text-[color:var(--muted)] mt-0.5">
                  #{confirmAction.order.orderNumber} —{" "}
                  {confirmAction.order.customer?.name || "Khách chưa xác định"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 space-y-4 pb-5">
              {/* Order summary */}
              <div className="rounded-xl bg-[color:var(--surface-soft)] border border-[color:var(--line)] px-4 py-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[color:var(--muted)]">Khách hàng</span>
                  <span className="font-semibold">
                    {confirmAction.order.customer?.name || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[color:var(--muted)]">Địa chỉ</span>
                  <span className="font-semibold text-right max-w-[220px] truncate">
                    {confirmAction.order.shippingAddress || "Chưa có địa chỉ"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[color:var(--muted)]">Số tiền</span>
                  <span className="font-black text-[color:var(--brand-strong)]">
                    {confirmAction.order.amount.toLocaleString("vi-VN")}đ
                  </span>
                </div>
                {confirmAction.order.trackingNumber && (
                  <div className="flex justify-between">
                    <span className="text-[color:var(--muted)]">Mã vận đơn</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {confirmAction.order.trackingNumber}
                    </span>
                  </div>
                )}
              </div>

              {/* State changes */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">
                  Thay đổi trạng thái
                </p>
                <div className="rounded-xl border border-[color:var(--line)] overflow-hidden divide-y divide-[color:var(--line)]">
                  {confirmAction.type === "email" ? (
                    <>
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-[color:var(--surface-soft)]">
                        <span className="text-[11px] font-semibold text-[color:var(--muted)] w-24 shrink-0">
                          Giao hàng
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] px-2 py-0.5 rounded-md border bg-amber-500/10 text-amber-700 border-amber-500/20 font-bold">
                            Chờ xử lý
                          </span>
                          <ArrowRight className="h-3 w-3 text-[color:var(--muted)]" />
                          <span className="text-[11px] px-2 py-0.5 rounded-md border bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-bold">
                            Hoàn thành
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-[color:var(--surface-soft)]">
                        <span className="text-[11px] font-semibold text-[color:var(--muted)] w-24 shrink-0">
                          Bước tiếp
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md border bg-blue-500/10 text-blue-700 border-blue-500/20 font-bold">
                          Email / vé được gửi đi tự động
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-[color:var(--surface-soft)]">
                        <span className="text-[11px] font-semibold text-[color:var(--muted)] w-24 shrink-0">
                          Zalo
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md border bg-[color:var(--brand-softer)] text-[color:var(--brand-strong)] border-[color:var(--brand-soft)] font-bold">
                          Tin nhắn yêu cầu giao hàng được gửi đi
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-[color:var(--surface-soft)]">
                        <span className="text-[11px] font-semibold text-[color:var(--muted)] w-24 shrink-0">
                          Shipper
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md border bg-[color:var(--surface)] text-[color:var(--muted)] border-[color:var(--line)]">
                          Cần phản hồi OK#{confirmAction.order.orderNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-[color:var(--surface-soft)]">
                        <span className="text-[11px] font-semibold text-[color:var(--muted)] w-24 shrink-0">
                          Đơn hàng
                        </span>
                        <span className="text-[11px] text-[color:var(--muted)]">
                          Trạng thái giữ nguyên — cập nhật sau khi shipper xác nhận
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Warning: no address */}
              {!confirmAction.order.shippingAddress && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Đơn hàng chưa có địa chỉ giao hàng. Hãy bấm Hủy và điền địa chỉ trước khi báo Shipper.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-[color:var(--surface-soft)] border-t border-[color:var(--line)] flex justify-end gap-3">
              <button
                type="button"
                className="px-5 h-10 rounded-xl border border-[color:var(--line)] text-sm font-medium hover:bg-[color:var(--surface-strong)] transition-colors"
                onClick={() => setConfirmAction(null)}
                disabled={isPending}
              >
                Hủy
              </button>
              <button
                type="button"
                className={`px-5 h-10 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-60 ${
                  confirmAction.type === "email"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-[color:var(--brand)] hover:bg-[color:var(--brand-strong)]"
                }`}
                onClick={handleConfirm}
                disabled={isPending}
              >
                {confirmAction.type === "email" ? (
                  <Mail className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isPending
                  ? "Đang xử lý..."
                  : confirmAction.type === "email"
                    ? "Xác nhận gửi"
                    : "Xác nhận báo Shipper"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
