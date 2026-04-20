"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, GripVertical, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateOrderStatus } from "@/lib/orders";
import { cn } from "@/lib/utils";

// Ánh xạ status từ DB sang UI Kanban
const STATUS_MAP = {
  PENDING: "waitPay",
  PAID: "paid",
  PROCESSING: "processing",
  DONE: "done",
  FOLLOW_UP: "followUp",
} as const;

type OrderStatus = "waitPay" | "paid" | "processing" | "done" | "followUp";

export interface OrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  amount: number;
  status: string;
}

export function OrderKanban({ 
  initialOrders,
  messages 
}: { 
  initialOrders: OrderItem[];
  messages: any;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Các cột Kanban
  const columns: { id: string; title: string; color: string }[] = [
    { id: "PENDING", title: messages?.waitPay || "Chờ thanh toán", color: "bg-amber-500" },
    { id: "PAID", title: messages?.paid || "Đã thanh toán", color: "bg-blue-500" },
    { id: "PROCESSING", title: messages?.processing || "Đang xử lý", color: "bg-indigo-500" },
    { id: "DONE", title: messages?.done || "Hoàn tất", color: "bg-green-500" },
  ];

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

  return (
    <div className="mt-6 flex gap-4 overflow-x-auto pb-4 snap-x">
      {columns.map((col) => {
        const colOrders = initialOrders.filter((o) => o.status === col.id);
        
        return (
          <div key={col.id} className="min-w-[280px] flex-1 flex flex-col bg-[color:var(--surface-soft)] rounded-xl border border-[color:var(--line)] overflow-hidden snap-center">
            {/* Header */}
            <div className={`h-1.5 w-full ${col.color}`} />
            <div className="p-3 bg-[color:var(--surface)] border-b border-[color:var(--line)] flex justify-between items-center">
              <h3 className="font-semibold text-sm text-[color:var(--foreground-strong)]">{col.title}</h3>
              <Badge variant="outline" className="bg-[color:var(--surface-strong)] text-[color:var(--muted)] hover:bg-[color:var(--surface-strong)]">
                {colOrders.length}
              </Badge>
            </div>
            
            {/* Items Container */}
            <div className="p-3 flex-1 flex flex-col gap-3 h-full min-h-[400px]">
              {colOrders.map((order) => (
                <Card 
                  key={order.id} 
                  className={cn(
                    "hover:border-[color:var(--brand-soft)] transition-colors group",
                    isPending ? "opacity-70 pointer-events-none" : ""
                  )}
                >
                  <CardContent className="p-3 flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-[color:var(--muted)] opacity-30 mt-1" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[color:var(--brand-strong)]">#{order.orderNumber}</span>
                      </div>
                      <div className="font-medium text-sm text-[color:var(--foreground-strong)]">
                        {order.customerName}
                      </div>
                      <div className="text-xs text-[color:var(--muted)] mt-1 flex justify-between">
                        <span>{messages?.total || "Tổng cộng"}</span>
                        <strong className="text-[color:var(--foreground)]">{order.amount.toLocaleString()} đ</strong>
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
              <Button variant="ghost" size="sm" className="w-full text-xs text-[color:var(--muted)] flex gap-1 h-8">
                <Plus className="h-3 w-3" />
                {messages?.addOrder || "Thêm đơn hàng"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
