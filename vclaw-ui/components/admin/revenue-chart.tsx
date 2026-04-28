"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

type DataPoint = { label: string; value: number };

export function RevenueChart({ data, title, description }: { data: DataPoint[]; title: string; description: string }) {
  const maxValue = Math.max(...data.map(d => d.value), 1000);
  
  return (
    <Card className="border-[color:var(--line)] overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[color:var(--brand-strong)]" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex h-64 items-end gap-3 sm:gap-4">
          {data.map((d, i) => {
            const height = (d.value / maxValue) * 100;
            return (
              <div key={d.label} className="group relative flex flex-1 flex-col items-center gap-2">
                {/* Tooltip */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-lg bg-[color:var(--foreground-strong)] px-2 py-1 text-[10px] font-bold text-[color:var(--surface-strong)] opacity-0 shadow-xl transition-all group-hover:-top-12 group-hover:opacity-100 whitespace-nowrap z-10">
                  {d.value.toLocaleString("vi-VN")} đ
                </div>
                
                {/* Bar */}
                <div 
                  className="w-full rounded-t-xl transition-all duration-500 ease-out group-hover:brightness-110 group-hover:shadow-[0_0_20px_-5px_var(--brand-glow)]"
                  style={{ 
                    height: `${height}%`, 
                    background: i === data.length - 1 
                      ? "var(--brand-gradient)" 
                      : "linear-gradient(to top, var(--brand-softer), var(--brand-soft))",
                    opacity: 0.8 + (height / 500)
                  }}
                />
                
                {/* Label */}
                <span className="text-[10px] font-medium text-[color:var(--muted)] uppercase tracking-wider text-center w-full truncate">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
