"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart } from "lucide-react";

type DistributionItem = { status: string; count: number };

const STATUS_COLORS: Record<string, string> = {
  DONE: "bg-emerald-500",
  PAID: "bg-blue-500",
  PROCESSING: "bg-amber-500",
  PENDING: "bg-slate-400",
  CANCELLED: "bg-rose-500",
  REFUNDED: "bg-purple-500",
};

const STATUS_LABELS: Record<string, string> = {
  DONE: "Hoàn tất",
  PAID: "Đã thanh toán",
  PROCESSING: "Đang xử lý",
  PENDING: "Chờ xử lý",
  CANCELLED: "Đã hủy",
  REFUNDED: "Hoàn tiền",
};

export function StatusDistributionChart({ 
  data, 
  title, 
  description 
}: { 
  data: DistributionItem[]; 
  title: string; 
  description?: string 
}) {
  const total = data.reduce((acc, curr) => acc + curr.count, 0);
  
  return (
    <Card className="border-[color:var(--line)] overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-4 w-4 text-[color:var(--brand-strong)]" />
              {title}
            </CardTitle>

          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {data.length > 0 ? (
            data.map((item) => {
              const percentage = total > 0 ? (item.count / total) * 100 : 0;
              const colorClass = STATUS_COLORS[item.status] || "bg-slate-500";
              const label = STATUS_LABELS[item.status] || item.status;
              
              return (
                <div key={item.status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[color:var(--foreground-strong)]">
                      {label}
                    </span>
                    <span className="text-[color:var(--muted)]">
                      {item.count} đơn ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--surface-subtle)]">
                    <div 
                      className={`h-full transition-all duration-1000 ease-out ${colorClass}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-[color:var(--muted)]">
              Chưa có dữ liệu đơn hàng
            </div>
          )}
          
          <div className="mt-6 pt-4 border-t border-[color:var(--line)] flex justify-between items-center">
            <span className="text-xs font-semibold text-[color:var(--muted)] uppercase">Tổng cộng</span>
            <span className="text-sm font-bold text-[color:var(--foreground-strong)]">{total} đơn hàng</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
