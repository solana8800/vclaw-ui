"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, GripVertical, CheckCircle2, Search, Clock, Info, X, ShoppingCart, MapPin, CreditCard, ChevronRight, Loader2, Hash, Calendar, User, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createOrder, updateOrderStatus } from "@/lib/commerce/orders";
import { cn } from "@/lib/shared";
import { toast } from "sonner";
import { PaymentDetailModal } from "./payment-detail-modal";

export interface OrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  amount: number;
  status: string;
  fulfillmentStatus?: string;
  fulfillmentType?: string;
  updatedAt?: string;
  createdAt?: string;
  items?: any[];
  shippingAddress?: string;
  shippingNote?: string;
  trackingNumber?: string;
  payments?: any[];
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    shippingAddress?: string | null;
  } | null;
}

type OrderCustomerOption = { id: string; name: string };

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
  const [previewOrder, setPreviewOrder] = useState<OrderItem | null>(null);
  const [statusChangeRequest, setStatusChangeRequest] = useState<{
    orderId: string;
    newStatus: string;
    orderNumber: string;
    oldStatusLabel: string;
    newStatusLabel: string;
  } | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);

  const columns: { id: string; title: string; color: string; description: string }[] = [
    { 
      id: "PENDING", 
      title: messages?.waitPay || "Chờ thanh toán", 
      color: "bg-amber-500",
      description: "Đơn mới tạo từ Bot, đang đợi khách chuyển khoản hoặc xác nhận."
    },
    { 
      id: "PAID", 
      title: messages?.paid || "Đã thanh toán", 
      color: "bg-sky-500",
      description: "Tiền đã về tài khoản (hoặc đã duyệt bill), sẵn sàng để giao hàng."
    },
    { 
      id: "PROCESSING", 
      title: messages?.processing || "Đang xử lý", 
      color: "bg-indigo-500",
      description: "Đang đóng gói hàng hoặc trong quá trình thực hiện dịch vụ."
    },
    { 
      id: "DONE", 
      title: messages?.done || "Hoàn tất", 
      color: "bg-green-500",
      description: "Đã giao hàng thành công hoặc khách đã sử dụng xong dịch vụ."
    },
    { 
      id: "FOLLOW_UP", 
      title: messages?.followUp || "Follow-up", 
      color: "bg-rose-500",
      description: "Cần gọi lại cho khách, hoặc đơn có vấn đề cần xử lý lại."
    },
    { 
      id: "CANCELLED", 
      title: "Đã hủy", 
      color: "bg-slate-400",
      description: "Đơn hàng đã bị hủy (Chỉ có thể hủy khi đơn đang ở trạng thái Chờ thanh toán)."
    },
  ];

  const statusOptions = ["PENDING", "PAID", "PROCESSING", "DONE", "FOLLOW_UP", "CANCELLED"];

  const handleStatusChange = (orderId: string, newStatus: string) => {
    const order = initialOrders.find((o) => o.id === orderId);
    if (!order) return;
    if (order.status === newStatus) return;

    const oldStatusLabel = columns.find((c) => c.id === order.status)?.title || order.status;
    const newStatusLabel = columns.find((c) => c.id === newStatus)?.title || newStatus;

    setStatusChangeRequest({
      orderId,
      newStatus,
      orderNumber: order.orderNumber,
      oldStatusLabel,
      newStatusLabel,
    });
  };

  const confirmStatusChange = () => {
    if (!statusChangeRequest) return;
    const { orderId, newStatus, orderNumber, newStatusLabel } = statusChangeRequest;

    startTransition(async () => {
      try {
        await updateOrderStatus(orderId, newStatus);
        toast.success(`Đã cập nhật đơn #${orderNumber} thành ${newStatusLabel}`);
        setStatusChangeRequest(null);
        router.refresh();
      } catch (error: any) {
        console.error("Lỗi khi cập nhật trạng thái đơn hàng:", error);
        toast.error(error.message || "Không thể cập nhật trạng thái đơn hàng");
        setStatusChangeRequest(null);
      }
    });
  };

  const [search, setSearch] = useState("");

  // Lọc đơn theo tìm kiếm
  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return initialOrders;
    return initialOrders.filter(
      (o) =>
        o.customerName.toLowerCase().includes(q) ||
        o.orderNumber.toLowerCase().includes(q)
    );
  }, [initialOrders, search]);

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
      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--muted)]" />
        <input
          type="text"
          placeholder="Tìm khách hàng hoặc mã đơn..."
          className="w-full pl-9 pr-4 h-10 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
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
          const colOrders = filteredOrders.filter((o) => o.status === col.id);

          return (
            <div
              key={col.id}
              className="min-w-[280px] flex-1 flex flex-col bg-[color:var(--surface-soft)] rounded-xl border border-[color:var(--line)] snap-center relative"
            >
              <div className={`h-1.5 w-full ${col.color}`} />
              <div className="p-3 bg-[color:var(--surface)] border-b border-[color:var(--line)] flex justify-between items-center group/col">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm text-[color:var(--foreground-strong)]">{col.title}</h3>
                  <div className="relative group/tip">
                    <Info className="h-3.5 w-3.5 text-[color:var(--muted)] cursor-help opacity-50 hover:opacity-100" />
                    <div className="absolute left-0 top-full mt-2 w-48 p-2 bg-slate-900 text-white text-[10px] leading-relaxed rounded-lg opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-opacity z-[100] shadow-2xl border border-slate-700">
                      {col.description}
                      <div className="absolute left-2 bottom-full border-4 border-transparent border-b-slate-900" />
                    </div>
                  </div>
                </div>
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
                          <button
                            onClick={() => setPreviewOrder(order)}
                            className="text-xs font-bold text-[color:var(--brand-strong)] hover:underline decoration-dotted underline-offset-2"
                          >
                            #{order.orderNumber}
                          </button>
                          {order.updatedAt && (
                            <span className="text-[10px] text-[color:var(--muted)] flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {new Date(order.updatedAt).toLocaleString("vi-VN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
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

      {/* Order Preview Modal */}
      {previewOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setPreviewOrder(null)}>
          <div
            className="bg-[color:var(--surface)] w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-[color:var(--line)] flex justify-between items-start bg-[color:var(--surface-strong)]">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <ShoppingCart className="h-5 w-5 text-[color:var(--brand)]" />
                  <h2 className="text-xl font-bold text-[color:var(--foreground-strong)]">
                    #{previewOrder.orderNumber}
                  </h2>
                  <Badge className={cn("text-white border-none text-xs", columns.find(c => c.id === previewOrder.status)?.color)}>
                    {columns.find(c => c.id === previewOrder.status)?.title || previewOrder.status}
                  </Badge>
                  {previewOrder.fulfillmentStatus && (
                    <Badge variant="outline" className="text-[10px] font-bold uppercase border-[color:var(--line)]">
                      {previewOrder.fulfillmentStatus.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-[color:var(--muted)]">
                  {previewOrder.createdAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Tạo: {new Date(previewOrder.createdAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  {previewOrder.updatedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Cập nhật: {new Date(previewOrder.updatedAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPreviewOrder(null)}
                className="p-2 rounded-full hover:bg-[color:var(--surface-soft)] text-[color:var(--muted)] transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Tổng quan tài chính */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-[color:var(--surface-soft)] border border-[color:var(--line)] p-4 text-center">
                  <div className="text-[10px] uppercase font-bold text-[color:var(--muted)] mb-1">Giá trị đơn</div>
                  <div className="text-lg font-black text-[color:var(--brand-strong)]">{previewOrder.amount.toLocaleString()} đ</div>
                </div>
                <div className="rounded-2xl bg-[color:var(--surface-soft)] border border-[color:var(--line)] p-4 text-center">
                  <div className="text-[10px] uppercase font-bold text-[color:var(--muted)] mb-1">Loại giao hàng</div>
                  <div className="text-sm font-bold">{previewOrder.fulfillmentType || "PHYSICAL"}</div>
                </div>
                <div className="rounded-2xl bg-[color:var(--surface-soft)] border border-[color:var(--line)] p-4 text-center">
                  <div className="text-[10px] uppercase font-bold text-[color:var(--muted)] mb-1">Số mặt hàng</div>
                  <div className="text-lg font-black">{previewOrder.items?.length ?? 0}</div>
                </div>
              </div>

              {/* Thông tin khách hàng */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold flex items-center gap-2 text-[color:var(--foreground-strong)]">
                  <User className="h-4 w-4 text-[color:var(--brand)]" />
                  Khách hàng
                </h3>
                <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase font-bold text-[color:var(--muted)]">Tên</span>
                    <span className="font-semibold text-[color:var(--foreground-strong)]">{previewOrder.customer?.name || previewOrder.customerName}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase font-bold text-[color:var(--muted)]">Số điện thoại</span>
                    <span className={cn("font-medium", previewOrder.customer?.phone ? "" : "text-[color:var(--muted)] italic")}>
                      {previewOrder.customer?.phone || "Chưa có"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase font-bold text-[color:var(--muted)]">Email</span>
                    <span className={cn("font-medium", previewOrder.customer?.email ? "" : "text-[color:var(--muted)] italic")}>
                      {previewOrder.customer?.email || "Chưa có"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase font-bold text-[color:var(--muted)]">Địa chỉ lưu trữ</span>
                    <span className={cn("font-medium text-xs", previewOrder.customer?.shippingAddress ? "" : "text-[color:var(--muted)] italic")}>
                      {previewOrder.customer?.shippingAddress || "Chưa có"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sản phẩm */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold flex items-center gap-2 text-[color:var(--foreground-strong)]">
                  <ShoppingCart className="h-4 w-4 text-[color:var(--brand)]" />
                  Sản phẩm trong đơn
                </h3>
                <div className="rounded-2xl border border-[color:var(--line)] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[color:var(--surface-soft)] border-b border-[color:var(--line)]">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-[10px] uppercase font-bold text-[color:var(--muted)]">Sản phẩm</th>
                        <th className="px-4 py-2.5 text-center text-[10px] uppercase font-bold text-[color:var(--muted)]">SL</th>
                        <th className="px-4 py-2.5 text-right text-[10px] uppercase font-bold text-[color:var(--muted)]">Đơn giá</th>
                        <th className="px-4 py-2.5 text-right text-[10px] uppercase font-bold text-[color:var(--muted)]">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--line)]">
                      {previewOrder.items && previewOrder.items.length > 0 ? (
                        previewOrder.items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-[color:var(--surface-soft)] transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-[color:var(--foreground-strong)]">
                                {item.product?.name || item.name || "Sản phẩm không tên"}
                              </div>
                              {(item.product?.productCode || item.productCode) && (
                                <div className="text-[10px] text-[color:var(--muted)] font-mono mt-0.5">
                                  {item.product?.productCode || item.productCode}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center font-bold">×{item.quantity}</td>
                            <td className="px-4 py-3 text-right text-[color:var(--muted)]">
                              {Number(item.price).toLocaleString("vi-VN")} đ
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-[color:var(--foreground-strong)]">
                              {(Number(item.price) * item.quantity).toLocaleString("vi-VN")} đ
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-[color:var(--muted)] italic text-xs">
                            Chưa có thông tin sản phẩm chi tiết
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {previewOrder.items && previewOrder.items.length > 0 && (
                      <tfoot className="border-t-2 border-[color:var(--line)] bg-[color:var(--surface-soft)]">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-right text-xs font-bold uppercase text-[color:var(--muted)]">Tổng cộng</td>
                          <td className="px-4 py-3 text-right text-base font-black text-[color:var(--brand-strong)]">
                            {previewOrder.amount.toLocaleString("vi-VN")} đ
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Giao nhận & Thanh toán */}
              <div className="grid md:grid-cols-2 gap-5">
                {/* Giao nhận */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-[color:var(--foreground-strong)]">
                    <MapPin className="h-4 w-4 text-[color:var(--brand)]" />
                    Giao nhận
                  </h3>
                  <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 space-y-3 text-sm">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase font-bold text-[color:var(--muted)]">Địa chỉ đơn hàng</span>
                      <span className={cn("font-medium", previewOrder.shippingAddress ? "" : "text-[color:var(--muted)] italic text-xs")}>
                        {previewOrder.shippingAddress || "Chưa có địa chỉ giao hàng"}
                      </span>
                    </div>
                    {previewOrder.trackingNumber && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase font-bold text-[color:var(--muted)]">Mã vận đơn</span>
                        <span className="font-mono font-bold text-[color:var(--brand-strong)]">{previewOrder.trackingNumber}</span>
                      </div>
                    )}
                    {previewOrder.shippingNote && previewOrder.shippingNote !== previewOrder.shippingAddress && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase font-bold text-[color:var(--muted)]">Ghi chú vận chuyển</span>
                        <span className="text-xs text-[color:var(--foreground)] italic leading-relaxed">
                          {previewOrder.shippingNote.split("[items]")[0].trim() || "—"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Thanh toán */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-[color:var(--foreground-strong)]">
                    <CreditCard className="h-4 w-4 text-[color:var(--brand)]" />
                    Thanh toán
                  </h3>
                  <div className="space-y-2">
                    {previewOrder.payments && previewOrder.payments.length > 0 ? (
                      previewOrder.payments.map((p: any, idx: number) => {
                        const isPaid = ["PAID", "COMPLETED", "VERIFIED", "APPROVED", "SUCCESS"].includes(p.status);
                        return (
                          <div
                            key={idx}
                            className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] hover:border-[color:var(--brand-soft)] transition-colors cursor-pointer group"
                            onClick={() => setSelectedPayment(p)}
                          >
                            <div className="flex items-center gap-3 p-3">
                              <div className="h-12 w-12 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] flex items-center justify-center shrink-0 overflow-hidden group-hover:border-[color:var(--brand-soft)] transition-colors">
                                {p.evidenceImage ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={p.evidenceImage} alt="bill" className="h-full w-full object-cover" />
                                ) : (
                                  <CreditCard className="h-5 w-5 text-[color:var(--brand)]" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-[color:var(--foreground-strong)]">
                                  {Number(p.amount).toLocaleString("vi-VN")} đ
                                </div>
                                <div className="text-[10px] uppercase text-[color:var(--muted)] font-bold flex items-center gap-1.5 mt-0.5">
                                  {p.method}
                                  {p.evidenceImage && (
                                    <span className="bg-sky-500/10 text-sky-600 border border-sky-500/20 px-1 py-0 rounded text-[8px] font-black">BILL</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="outline" className={cn(
                                  "text-[10px] font-bold border",
                                  isPaid
                                    ? "text-green-600 border-green-500/30 bg-green-500/5"
                                    : p.status === "COD_PENDING"
                                    ? "text-blue-600 border-blue-500/30 bg-blue-500/5"
                                    : "text-amber-600 border-amber-500/30 bg-amber-500/5"
                                )}>
                                  {p.status}
                                </Badge>
                                <ChevronRight className="h-4 w-4 text-[color:var(--muted)] group-hover:text-[color:var(--brand-strong)] transition-colors" />
                              </div>
                            </div>
                            {p.evidenceImage && (
                              <div className="px-3 pb-3">
                                <div className="rounded-xl overflow-hidden border border-[color:var(--line)] max-h-36">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={p.evidenceImage} alt="Bill thanh toán" className="w-full object-cover object-top" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-[color:var(--surface-soft)] p-6 text-center text-[color:var(--muted)] text-xs italic">
                        Chưa ghi nhận giao dịch thanh toán
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-[color:var(--surface-soft)] border-t border-[color:var(--line)] flex justify-between items-center gap-3">
              <div className="text-xs text-[color:var(--muted)]">
                <span className="font-bold">ID:</span> <span className="font-mono">{previewOrder.id}</span>
              </div>
              <Button variant="outline" className="rounded-xl" onClick={() => setPreviewOrder(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Dialog */}
      {statusChangeRequest && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-200">
          <div className="bg-[color:var(--surface)] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[color:var(--line)] animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-[color:var(--brand)]">
                <div className="p-2 bg-[color:var(--brand-soft)] rounded-full">
                  <Info className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-[color:var(--foreground-strong)]">Xác nhận chuyển trạng thái</h3>
              </div>
              
              <div className="p-4 bg-[color:var(--surface-soft)] rounded-xl border border-[color:var(--line)] space-y-3">
                <p className="text-sm text-[color:var(--muted)]">
                  Bạn có chắc chắn muốn chuyển đơn hàng <span className="font-bold text-[color:var(--brand-strong)]">#{statusChangeRequest.orderNumber}</span>:
                </p>
                <div className="flex items-center justify-center gap-3 text-sm font-medium">
                  <Badge variant="outline" className="bg-[color:var(--surface-strong)] text-[color:var(--muted)]">
                    {statusChangeRequest.oldStatusLabel}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-[color:var(--muted)]" />
                  <Badge className={cn("text-white border-none", columns.find(c => c.id === statusChangeRequest.newStatus)?.color)}>
                    {statusChangeRequest.newStatusLabel}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[color:var(--surface-soft)] border-t border-[color:var(--line)] flex justify-end gap-3">
              <Button 
                variant="outline" 
                className="rounded-xl px-6 h-10" 
                onClick={() => setStatusChangeRequest(null)}
                disabled={isPending}
              >
                Hủy
              </Button>
              <Button 
                className="rounded-xl px-6 h-10 bg-[color:var(--brand)] hover:bg-[color:var(--brand-strong)] border-none text-white" 
                onClick={confirmStatusChange}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xác nhận chuyển"}
              </Button>
            </div>
          </div>
        </div>
      )}


      {/* Payment Detail Modal */}
      <PaymentDetailModal 
        payment={selectedPayment ? { ...selectedPayment, order: previewOrder } : null} 
        onClose={() => setSelectedPayment(null)} 
      />
    </div>
  );
}
