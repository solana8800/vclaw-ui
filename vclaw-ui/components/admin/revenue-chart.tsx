"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

type DataPoint = { label: string; value: number };

export function RevenueChart({ data, title, description }: { data: DataPoint[]; title: string; description?: string }) {
  // Tìm giá trị lớn nhất để làm mốc, tối thiểu là 10
  const maxValue = Math.max(...data.map(d => d.value), 10);
  
  return (
    <Card className="border-[color:var(--line)] overflow-hidden bg-[color:var(--surface-glass)] backdrop-blur shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2 text-[color:var(--foreground-strong)]">
              <TrendingUp className="h-4 w-4 text-[color:var(--brand-strong)]" />
              {title}
            </CardTitle>

          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex h-64 items-stretch gap-1 sm:gap-2 px-1">
          {data.map((d, i) => {
            const percentage = (d.value / maxValue) * 100;
            const hasData = d.value > 0;
            const barHeight = hasData ? Math.max(percentage, 3) : 0;

            return (
              <div key={d.label + i} className="flex-1 flex flex-col group">
                <div className="relative flex-1 flex items-end">
                  {/* Tooltip */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-black/90 px-2 py-1 text-[10px] font-bold text-white opacity-0 shadow-xl transition-all group-hover:-top-10 group-hover:opacity-100 whitespace-nowrap z-40 pointer-events-none border border-white/10">
                    {d.value.toLocaleString("vi-VN")}
                  </div>
                  
                  {/* Modern Glassy Bar (Revenue - Red/Crimson) */}
                  <div 
                    className="w-full rounded-t-sm sm:rounded-t-md transition-all duration-500 ease-out group-hover:brightness-125"
                    style={{ 
                      height: `${barHeight}%`, 
                      background: i === data.length - 1 
                        ? "linear-gradient(to top, rgba(209, 50, 56, 0.4), rgba(255, 77, 85, 0.9))" 
                        : hasData ? "linear-gradient(to top, rgba(177, 37, 42, 0.2), rgba(177, 37, 42, 0.6))" : "rgba(255,255,255,0.03)",
                      borderTop: hasData ? "2px solid var(--brand-strong)" : "none",
                      boxShadow: hasData ? "0 -4px 12px var(--brand-glow)" : "none",
                    }}
                  />
                </div>
                
                <div className="h-8 flex items-center justify-center">
                  <span className="text-[8px] sm:text-[10px] font-medium text-[color:var(--muted)] uppercase tracking-tighter truncate w-full text-center">
                    {d.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
