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
  updatedAt?: string;
  items?: any[];
  shippingAddress?: string;
  shippingNote?: string;
  payments?: any[];
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-300" onClick={() => setPreviewOrder(null)}>
          <div 
            className="bg-[color:var(--surface)] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[color:var(--line)] flex justify-between items-center bg-[color:var(--surface-strong)]">
              <div>
                <h2 className="text-xl font-bold text-[color:var(--foreground-strong)] flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-[color:var(--brand)]" />
                  Chi tiết đơn hàng #{previewOrder.orderNumber}
                </h2>
                <p className="text-sm text-[color:var(--muted)]">Khách hàng: {previewOrder.customerName}</p>
              </div>
              <button 
                onClick={() => setPreviewOrder(null)}
                className="p-2 rounded-full hover:bg-[color:var(--surface-soft)] text-[color:var(--muted)] transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Status & General Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[color:var(--muted)] tracking-wider">Trạng thái</span>
                  <div className="flex">
                    <Badge className={cn("px-3 py-1 text-white border-none", columns.find(c => c.id === previewOrder.status)?.color)}>
                      {columns.find(c => c.id === previewOrder.status)?.title || previewOrder.status}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[10px] uppercase font-bold text-[color:var(--muted)] tracking-wider">Tổng tiền</span>
                  <div className="text-xl font-bold text-[color:var(--brand-strong)]">
                    {previewOrder.amount.toLocaleString()} đ
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-[color:var(--foreground-strong)]">
                  <ShoppingCart className="h-4 w-4" />
                  Danh sách sản phẩm
                </h3>
                <div className="rounded-2xl border border-[color:var(--line)] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[color:var(--surface-soft)] border-b border-[color:var(--line)]">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-[color:var(--muted)]">Sản phẩm</th>
                        <th className="px-4 py-2 text-center font-medium text-[color:var(--muted)]">SL</th>
                        <th className="px-4 py-2 text-right font-medium text-[color:var(--muted)]">Đơn giá</th>
                        <th className="px-4 py-2 text-right font-medium text-[color:var(--muted)]">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--line)]">
                      {previewOrder.items && previewOrder.items.length > 0 ? (
                        previewOrder.items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-[color:var(--surface-soft)] transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-[color:var(--foreground-strong)]">{item.product?.name || "Sản phẩm không tên"}</div>
                              <div className="text-[10px] text-[color:var(--muted)] font-mono">{item.product?.productCode}</div>
                            </td>
                            <td className="px-4 py-3 text-center">x{item.quantity}</td>
                            <td className="px-4 py-3 text-right">{item.price.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-bold">{(item.price * item.quantity).toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-[color:var(--muted)] italic">
                            Chưa có thông tin sản phẩm chi tiết
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Shipping & Payment */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-[color:var(--foreground-strong)]">
                    <MapPin className="h-4 w-4" />
                    Thông tin giao nhận
                  </h3>
                  <div className="p-4 rounded-2xl bg-[color:var(--surface-soft)] border border-[color:var(--line)] space-y-2 text-sm">
                    <div className="flex gap-2">
                      <span className="text-[color:var(--muted)] shrink-0">Địa chỉ:</span>
                      <span className="text-[color:var(--foreground-strong)]">{previewOrder.shippingAddress || "Chưa cập nhật"}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[color:var(--muted)] shrink-0">Ghi chú:</span>
                      <span className="text-[color:var(--foreground-strong)] italic">{previewOrder.shippingNote || "Không có ghi chú"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-[color:var(--foreground-strong)]">
                    <CreditCard className="h-4 w-4" />
                    Thanh toán
                  </h3>
                  <div className="space-y-2">
                    {previewOrder.payments && previewOrder.payments.length > 0 ? (
                      previewOrder.payments.map((p: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="p-3 rounded-xl bg-[color:var(--surface-soft)] border border-[color:var(--line)] flex justify-between items-center text-sm cursor-pointer hover:border-[color:var(--brand-soft)] transition-colors group"
                          onClick={() => setSelectedPayment(p)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-[color:var(--surface)] rounded-lg border border-[color:var(--line)] relative group-hover:border-[color:var(--brand-soft)] transition-colors">
                              {p.evidenceImage ? (
                                <img src={p.evidenceImage} className="h-6 w-6 object-cover rounded-sm" />
                              ) : (
                                <CreditCard className="h-4 w-4 text-[color:var(--brand)]" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold">{p.amount.toLocaleString()} đ</div>
                              <div className="text-[10px] text-[color:var(--muted)] uppercase flex items-center gap-1">
                                {p.method}
                                {p.evidenceImage && <span className="text-[color:var(--brand-strong)] text-[8px] font-bold bg-[color:var(--brand-soft)] px-1 rounded">BILL</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn("text-[10px]", (p.status === "PAID" || p.status === "COMPLETED") ? "text-green-500 border-green-500/20 bg-green-500/5" : "text-amber-500 border-amber-500/20 bg-amber-500/5")}>
                              {p.status}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-[color:var(--muted)] group-hover:text-[color:var(--brand-strong)] transition-colors" />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 rounded-2xl bg-[color:var(--surface-soft)] border border-[color:var(--line)] text-center text-[color:var(--muted)] text-xs italic">
                        Chưa ghi nhận giao dịch
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[color:var(--surface-soft)] border-t border-[color:var(--line)] flex justify-end gap-3">
              <Button variant="outline" className="rounded-xl" onClick={() => setPreviewOrder(null)}>
                Đóng
              </Button>
              <Button 
                className="rounded-xl"
                onClick={() => {
                  setPreviewOrder(null);
                  // Có thể điều hướng đến trang chi tiết thực sự nếu cần
                }}
              >
                Xử lý đơn hàng
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
