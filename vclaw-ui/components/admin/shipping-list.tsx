
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

export function ShippingList({ 
  orders,
  shipperGroupId 
}: { 
  orders: OrderWithCustomer[],
  shipperGroupId?: string 
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("admin.shipping.fulfillment");
  
  const [editingNotes, setEditingNotes] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, { note: string; estimate: string }>>({});

  const handleSendEmail = (orderId: string) => {
    toast.success(t("toastSendingEmail"));
    startTransition(async () => {
      await updateOrderFulfillment(orderId, "COMPLETED");
      toast.success(t("toastEmailSuccess"));
    });
  };

  const handleNotifyShipper = (order: OrderWithCustomer) => {
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
  };

  const toggleEditNote = (order: OrderWithCustomer) => {
    const isEditing = editingNotes[order.id];
    if (!isEditing) {
      setDrafts(prev => ({
        ...prev,
        [order.id]: {
          note: order.shippingNote || "",
          estimate: order.shippingEstimate ? String(order.shippingEstimate) : ""
        }
      }));
    }
    setEditingNotes(prev => ({ ...prev, [order.id]: !isEditing }));
  };

  const handleSaveNote = (id: string) => {
    const d = drafts[id];
    if (!d) return;
    
    const est = d.estimate.trim() === "" ? null : Number(d.estimate.replace(/,/g, ""));
    
    startTransition(async () => {
      await updateOrderShipping(id, {
        shippingNote: d.note.trim() || null,
        shippingEstimate: est !== null && Number.isFinite(est) ? est : null,
      });
      setEditingNotes(prev => ({ ...prev, [id]: false }));
      toast.success("Đã cập nhật ghi chú giao hàng");
      router.refresh();
    });
  };

  return (
    <Card className="border-[color:var(--line)] shadow-xl bg-gradient-to-br from-[color:var(--surface)] to-[color:var(--surface-soft)]">
      <CardHeader className="border-b border-[color:var(--line)] pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <Package className="h-6 w-6 text-[color:var(--brand)]" />
              {t("title")}
            </CardTitle>

          </div>
          <Badge variant="outline" className="bg-[color:var(--surface-strong)] text-[color:var(--brand)] border-[color:var(--brand-soft)]">
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
              const isEditing = editingNotes[order.id];
              const draft = drafts[order.id] || { note: "", estimate: "" };
              
              return (
                <div key={order.id} className="p-4 hover:bg-[color:var(--surface-soft)]/50 transition-all group border-b border-[color:var(--line)] last:border-0">
                  <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                    {/* Primary Info: Order & Status */}
                    <div className="flex items-center gap-3 shrink-0 min-w-[140px]">
                      <div className="h-10 w-10 rounded-xl bg-[color:var(--brand-soft)]/10 flex items-center justify-center border border-[color:var(--brand-soft)]/20 shrink-0">
                        <Package className="h-5 w-5 text-[color:var(--brand)]" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-base font-bold text-[color:var(--foreground-strong)] tracking-tight">
                          #{order.orderNumber}
                        </span>
                        <div className="flex gap-1">
                          <div className={`w-2 h-2 rounded-full ${order.status === "PAID" ? "bg-green-500" : "bg-yellow-500"}`} title={order.status === "PAID" ? t("statusPaid") : t("statusPending")} />
                          <div className={`w-2 h-2 rounded-full ${order.fulfillmentType === "DIGITAL_EMAIL" ? "bg-blue-500" : "bg-orange-500"}`} title={order.fulfillmentType === "DIGITAL_EMAIL" ? t("typeDigital") : t("typePhysical")} />
                        </div>
                      </div>
                    </div>

                    {/* Customer & Address: Compact Inline */}
                    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                      <div className="flex items-center gap-2 truncate">
                        <User className="h-3.5 w-3.5 text-[color:var(--muted)] shrink-0" />
                        <span className="font-semibold text-sm truncate">
                          {order.customer?.name || "Khách chưa xác định"}
                        </span>
                        <span className="text-xs text-[color:var(--muted)] truncate">
                          {order.customer?.phone || "Không có SĐT"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 truncate text-[color:var(--muted)]">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-xs truncate italic">
                          {order.shippingAddress || order.shippingNote || t("noAddress")}
                        </span>
                      </div>
                    </div>

                    {/* Commercial: Amount & Estimate */}
                    <div className="flex items-center gap-4 shrink-0 px-4 md:border-l border-[color:var(--line)]">
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-[color:var(--muted)] leading-none mb-0.5">{t("total")}</p>
                        <p className="font-bold text-sm text-[color:var(--foreground-strong)]">{order.amount.toLocaleString('vi-VN')}đ</p>
                      </div>
                      {order.shippingEstimate && (
                        <div className="bg-orange-500/10 text-orange-600 px-2 py-1 rounded-lg border border-orange-500/20 text-[10px] font-bold shrink-0">
                          Ship: {order.shippingEstimate.toLocaleString('vi-VN')}đ
                        </div>
                      )}
                    </div>

                    {/* Compact Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      {order.fulfillmentType === "DIGITAL_EMAIL" ? (
                        <Button 
                          size="sm" 
                          className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-bold"
                          disabled={order.status !== "PAID" || isPending}
                          onClick={() => handleSendEmail(order.id)}
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
                            onClick={() => toggleEditNote(order)}
                            title="Ghi chú & Phí ship"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-8 px-2 rounded-lg text-orange-600 hover:bg-orange-50 text-xs font-bold"
                            onClick={() => window.open(GHN_URLS.PORTAL_CREATE, '_blank')}
                            title={t("actionCreateGhn")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-8 px-3 rounded-lg bg-[color:var(--brand)] hover:bg-[color:var(--brand-strong)] text-white text-xs font-bold shadow-sm"
                            disabled={order.status !== "PAID" && order.shippingNote?.toLowerCase() !== 'cod'}
                            onClick={() => handleNotifyShipper(order)}
                          >
                            <Send className="h-3.5 w-3.5 mr-1.5" />
                            Báo Shipper
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Note Edit Section (Tighter) */}
                  {isEditing && (
                    <div className="mt-3 p-4 rounded-2xl border-2 border-[color:var(--brand-soft)] bg-[color:var(--surface)] space-y-3 shadow-lg animate-in slide-in-from-top-1 duration-200">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-[color:var(--muted)] ml-1">Địa chỉ / Ghi chú</label>
                          <textarea
                            className="w-full h-16 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-3 text-xs outline-none focus:ring-1 focus:ring-[color:var(--brand)]"
                            value={draft.note}
                            disabled={isPending}
                            onChange={(e) => setDrafts(prev => ({
                              ...prev,
                              [order.id]: { ...draft, note: e.target.value }
                            }))}
                          />
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-[color:var(--muted)] ml-1">Phí ship ước tính</label>
                            <Input
                              type="text"
                              className="h-9 rounded-xl bg-[color:var(--surface-soft)] text-xs font-bold"
                              value={draft.estimate}
                              disabled={isPending}
                              onChange={(e) => setDrafts(prev => ({
                                ...prev,
                                [order.id]: { ...draft, estimate: e.target.value }
                              }))}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1 h-8 rounded-lg bg-[color:var(--brand)] text-xs" disabled={isPending} onClick={() => handleSaveNote(order.id)}>
                              Lưu
                            </Button>
                            <Button size="sm" variant="ghost" className="flex-1 h-8 rounded-lg text-xs" disabled={isPending} onClick={() => toggleEditNote(order)}>
                              Hủy
                            </Button>
                          </div>
                        </div>
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
  );
}
