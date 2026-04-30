"use client";

import { CreditCard, X, Info, Calendar, Hash, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function PaymentDetailModal({ 
  payment, 
  onClose 
}: { 
  payment: any; 
  onClose: () => void;
}) {
  if (!payment) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
      <div className="bg-[color:var(--surface)] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-[color:var(--line)] animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-[color:var(--line)] flex justify-between items-center bg-[color:var(--surface-soft)]">
          <h3 className="font-bold text-[color:var(--foreground-strong)] flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[color:var(--brand)]" />
            Chi tiết giao dịch
          </h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[color:var(--surface-strong)] rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Thông tin đơn hàng */}
          <div className="p-4 rounded-xl border border-[color:var(--brand-soft)] bg-[color:var(--brand-soft)] bg-opacity-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-[color:var(--brand-strong)]">
                <Hash className="h-4 w-4" />
                #{payment.order?.orderNumber || "N/A"}
              </div>
              <Badge variant="outline" className="bg-[color:var(--surface)]">
                {payment.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
              <User className="h-3.5 w-3.5" />
              Khách hàng: <span className="font-medium text-[color:var(--foreground-strong)]">{payment.order?.customer?.name || "Khách vãng lai"}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-[color:var(--muted)] tracking-wider flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Số tiền
              </label>
              <div className="text-xl font-black text-[color:var(--brand-strong)]">
                {payment.amount.toLocaleString("vi-VN")} đ
              </div>
            </div>
            <div className="space-y-1 text-right">
              <label className="text-[10px] uppercase font-bold text-[color:var(--muted)] tracking-wider">Phương thức</label>
              <div className="font-medium">{payment.method}</div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-[color:var(--muted)] tracking-wider flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Ngày tạo
              </label>
              <div className="text-sm">
                {new Date(payment.createdAt).toLocaleString("vi-VN")}
              </div>
            </div>
          </div>

          {payment.evidenceImage ? (
            <div className="space-y-3">
              <label className="text-[10px] uppercase font-bold text-[color:var(--muted)] tracking-wider flex items-center gap-2">
                Hình ảnh hóa đơn / Bill
              </label>
              <div className="rounded-xl overflow-hidden border border-[color:var(--line)] bg-[color:var(--surface-soft)] group relative">
                <img 
                  src={payment.evidenceImage} 
                  alt="Bill Evidence" 
                  className="w-full h-auto object-contain max-h-[400px] transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl border-2 border-dashed border-[color:var(--line)] bg-[color:var(--surface-soft)] text-center space-y-2">
              <Info className="h-8 w-8 text-[color:var(--muted)] mx-auto opacity-20" />
              <p className="text-sm text-[color:var(--muted)] italic">Không có hình ảnh minh chứng giao dịch</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-[color:var(--surface-soft)] border-t border-[color:var(--line)] flex justify-end">
          <Button className="rounded-xl px-8" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
