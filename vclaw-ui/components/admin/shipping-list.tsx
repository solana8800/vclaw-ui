
"use client";

import { useState, useTransition } from "react";
import { 
  Truck, 
  Mail, 
  Send, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Package,
  User,
  MapPin,
  CreditCard
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateOrderFulfillment, type OrderWithCustomer } from "@/lib/commerce/orders";
import { notifyShipperZalo } from "@/lib/actions/shipping-actions";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function ShippingList({ 
  orders,
  shipperGroupId 
}: { 
  orders: OrderWithCustomer[],
  shipperGroupId?: string 
}) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("admin.shipping.fulfillment");

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

  return (
    <Card className="border-[color:var(--line)] shadow-xl bg-gradient-to-br from-[color:var(--surface)] to-[color:var(--surface-soft)]">
      <CardHeader className="border-b border-[color:var(--line)] pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <Package className="h-6 w-6 text-[color:var(--brand)]" />
              {t("title")}
            </CardTitle>
            <CardDescription>
              {t("description")}
            </CardDescription>
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
            orders.map((order) => (
              <div key={order.id} className="p-6 hover:bg-[color:var(--surface-soft)] transition-all group">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  {/* Order Info */}
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-[color:var(--foreground-strong)]">
                        #{order.orderNumber}
                      </span>
                      <Badge className={
                        order.fulfillmentType === "DIGITAL_EMAIL" 
                        ? "bg-blue-100 text-blue-700 border-blue-200" 
                        : "bg-orange-100 text-orange-700 border-orange-200"
                      }>
                        {order.fulfillmentType === "DIGITAL_EMAIL" ? t("typeDigital") : t("typePhysical")}
                      </Badge>
                      <Badge variant="outline" className={
                        order.status === "PAID" 
                        ? "bg-green-50 text-green-700 border-green-200" 
                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                      }>
                        {order.status === "PAID" ? t("statusPaid") : t("statusPending")}
                      </Badge>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="flex items-start gap-2 text-sm">
                        <User className="h-4 w-4 mt-0.5 text-[color:var(--muted)]" />
                        <div>
                          <p className="font-semibold">{order.customer.name}</p>
                          <p className="text-[color:var(--muted)]">{order.customer.phone || t("noPhone")}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 mt-0.5 text-[color:var(--muted)]" />
                        <p className="text-[color:var(--foreground)] line-clamp-2">
                          {order.shippingAddress || order.shippingNote || t("noAddress")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5 text-[color:var(--muted)]">
                        <CreditCard className="h-3.5 w-3.5" />
                        {t("total")} <b className="text-[color:var(--foreground)]">{order.amount.toLocaleString('vi-VN')}đ</b>
                      </div>
                      <div className="flex items-center gap-1.5 text-[color:var(--muted)]">
                        <Clock className="h-3.5 w-3.5" />
                        {t("createdAt")} {new Date(order.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
                    {order.fulfillmentType === "DIGITAL_EMAIL" ? (
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-200"
                        disabled={order.status !== "PAID" || isPending}
                        onClick={() => handleSendEmail(order.id)}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {t("actionSendEmail")}
                      </Button>
                    ) : (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-orange-200 text-orange-700 hover:bg-orange-50 font-semibold"
                          onClick={() => window.open('https://khachhang.ghn.vn/order/create', '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {t("actionCreateGhn")}
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-[color:var(--brand)] hover:bg-[color:var(--brand-strong)] text-white font-semibold shadow-lg shadow-[color:var(--brand-soft)]"
                          disabled={order.status !== "PAID" && order.shippingNote?.toLowerCase() !== 'cod'}
                          onClick={() => handleNotifyShipper(order)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {t("actionNotifyShipper")}
                        </Button>
                      </>
                    )}
                    
                    {order.status !== "PAID" && order.fulfillmentType === "DIGITAL_EMAIL" && (
                      <div className="flex items-center gap-1.5 text-[10px] text-red-500 font-medium px-2">
                        <AlertCircle className="h-3 w-3" />
                        {t("needPayment")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
