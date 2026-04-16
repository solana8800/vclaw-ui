"use client";

import { useState } from "react";
import { Plus, GripVertical, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type OrderStatus = "waitPay" | "paid" | "processing" | "done" | "followUp";

interface Order {
  id: string;
  customer: string;
  amount: string;
  status: OrderStatus;
}

export function OrderKanban({ messages }: { messages: any }) {
  const [orders, setOrders] = useState<Order[]>([
    { id: "ORD-201", customer: "Linh Nguyen", amount: "1,200,000", status: "waitPay" },
    { id: "ORD-198", customer: "Anh Tran", amount: "760,000", status: "paid" },
    { id: "ORD-192", customer: "Mai Pham", amount: "450,000", status: "processing" },
    { id: "ORD-189", customer: "Bao Khanh", amount: "3,200,000", status: "done" },
  ]);

  const columns: { id: OrderStatus; title: string; color: string }[] = [
    { id: "waitPay", title: messages?.waitPay || "Wait Pay", color: "bg-amber-500" },
    { id: "paid", title: messages?.paid || "Paid", color: "bg-blue-500" },
    { id: "processing", title: messages?.processing || "Processing", color: "bg-indigo-500" },
    { id: "done", title: messages?.done || "Done", color: "bg-green-500" },
  ];

  return (
    <div className="mt-6 flex gap-4 overflow-x-auto pb-4 snap-x">
      {columns.map((col) => {
        const colOrders = orders.filter((o) => o.status === col.id);
        
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
            <div className="p-3 flex-1 flex flex-col gap-3 h-full min-h-[300px]">
              {colOrders.map((order) => (
                <Card key={order.id} className="cursor-grab active:cursor-grabbing hover:border-[color:var(--brand-soft)] transition-colors group">
                  <CardContent className="p-3 flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-[color:var(--muted)] opacity-30 mt-1 cursor-grab" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[color:var(--brand-strong)]">{order.id}</span>
                      </div>
                      <div className="font-medium text-sm text-[color:var(--foreground-strong)]">
                        {order.customer}
                      </div>
                      <div className="text-xs text-[color:var(--muted)] mt-1 flex justify-between">
                        <span>{messages?.total || "Total"}</span>
                        <strong className="text-[color:var(--foreground)]">{order.amount} VND</strong>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {colOrders.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[color:var(--line)] rounded-lg text-center opacity-50 py-8">
                  <CheckCircle2 className="h-6 w-6 text-[color:var(--muted)] mb-2" />
                  <span className="text-xs text-[color:var(--muted)]">Empty</span>
                </div>
              )}
            </div>

            <div className="p-2 border-t border-[color:var(--line)] bg-[color:var(--surface)]">
              <Button variant="ghost" size="sm" className="w-full text-xs text-[color:var(--muted)] flex gap-1 h-8">
                <Plus className="h-3 w-3" />
                {messages?.addOrder || "Add Order"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
