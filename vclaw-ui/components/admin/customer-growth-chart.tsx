"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users } from "lucide-react";

type DataPoint = { label: string; value: number };

export function CustomerGrowthChart({ data, title, description }: { data: DataPoint[]; title: string; description: string }) {
  // Tìm giá trị lớn nhất để làm mốc, tối thiểu là 5
  const maxValue = Math.max(...data.map(d => d.value), 5);
  
  return (
    <Card className="border-[color:var(--line)] overflow-hidden bg-[color:var(--surface-glass)] backdrop-blur shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2 text-[color:var(--foreground-strong)]">
              <Users className="h-4 w-4 text-indigo-400" />
              {title}
            </CardTitle>
            <CardDescription className="text-[color:var(--muted)] text-xs uppercase tracking-widest font-semibold">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex h-64 items-stretch gap-2 sm:gap-4 px-2">
          {data.map((d, i) => {
            const percentage = (d.value / maxValue) * 100;
            const hasData = d.value > 0;
            const barHeight = hasData ? Math.max(percentage, 5) : 0;

            return (
              <div key={d.label + i} className="flex-1 flex flex-col group">
                <div className="relative flex-1 flex items-end">
                  {/* Tooltip */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-black/90 px-2 py-1 text-[10px] font-bold text-white opacity-0 shadow-xl transition-all group-hover:-top-10 group-hover:opacity-100 whitespace-nowrap z-40 pointer-events-none border border-white/10">
                    {d.value} khách hàng
                  </div>
                  
                  {/* Modern Pill Bar (Growth - Indigo/Cyan) */}
                  <div 
                    className="w-full rounded-full transition-all duration-500 ease-out group-hover:scale-y-105 group-hover:brightness-125"
                    style={{ 
                      height: `${barHeight}%`, 
                      background: hasData 
                        ? "linear-gradient(to top, rgba(99, 102, 241, 0.4), rgba(34, 211, 238, 0.8))" 
                        : "rgba(255,255,255,0.03)",
                      boxShadow: hasData ? "0 4px 15px rgba(99, 102, 241, 0.3)" : "none",
                      opacity: hasData ? 1 : 0.05
                    }}
                  />
                </div>
                
                {/* Label below the track */}
                <div className="h-8 flex items-center justify-center">
                  <span className="text-[9px] sm:text-[11px] font-bold text-[color:var(--muted)] truncate w-full text-center">
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
