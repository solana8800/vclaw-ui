"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type BreakDownItem = {
  label: string;
  count: number;
};

export function StatusProgressBars({ 
  data, 
  title, 
  description,
  totalItems
}: { 
  data: BreakDownItem[]; 
  title: string; 
  description?: string;
  totalItems: number;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-amber-400";
      case "PROCESSING": return "bg-blue-400";
      case "PAID": return "bg-emerald-400";
      case "COMPLETED": return "bg-emerald-500";
      case "DONE": return "bg-slate-400";
      case "FOLLOW_UP": return "bg-purple-400";
      case "FAILED": return "bg-red-400";
      case "CANCELLED": return "bg-red-500";
      default: return "bg-slate-300";
    }
  };

  return (
    <Card className="border-[color:var(--line)] bg-[color:var(--surface)]">
      <CardContent className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-[color:var(--foreground-strong)]">{title}</h3>
          {description && <p className="text-sm text-[color:var(--muted)]">{description}</p>}
        </div>
        
        {totalItems === 0 ? (
          <div className="text-center p-4 text-sm text-[color:var(--muted)] border-2 border-dashed border-[color:var(--line)] rounded-lg">
            Chưa có dữ liệu
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex w-full h-4 rounded-full overflow-hidden bg-[color:var(--surface-soft)]">
              {data.map((item) => {
                const percentage = (item.count / totalItems) * 100;
                if (percentage === 0) return null;
                return (
                  <div 
                    key={item.label}
                    style={{ width: `${percentage}%` }}
                    className={`h-full ${getStatusColor(item.label)} transition-all duration-500 hover:opacity-80`}
                    title={`${item.label}: ${item.count} (${percentage.toFixed(1)}%)`}
                  />
                );
              })}
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data.map((item) => {
                const percentage = (item.count / totalItems) * 100;
                return (
                  <div key={item.label} className="flex items-center justify-between border border-[color:var(--line)] rounded-lg p-2 bg-[color:var(--surface-soft)]">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(item.label)}`} />
                      <span className="text-xs font-bold text-[color:var(--foreground)]">{item.label}</span>
                    </div>
                    <Badge variant="outline" className="font-mono">{item.count}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
