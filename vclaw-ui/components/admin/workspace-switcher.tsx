"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Store, 
  ChevronsUpDown,
  Check,
  Plus
} from "lucide-react";
import { cn } from "@/lib/shared";
import { Button } from "@/components/ui/button";

type Workspace = {
  id: string;
  name: string;
  industry: string | null;
};

export function WorkspaceSwitcher({
  initialWorkspaces,
  collapsed,
  activeIndustry,
  onWorkspaceChange,
}: {
  initialWorkspaces: Workspace[];
  collapsed?: boolean;
  activeIndustry?: string | null;
  onWorkspaceChange?: (workspace: Workspace) => void;
}) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
  const [isOpen, setIsOpen] = useState(false);
  const [currentId, setCurrentId] = useState(initialWorkspaces[0]?.id);

  // Đồng bộ currentId khi activeIndustry thay đổi từ bên ngoài
  useEffect(() => {
    if (activeIndustry) {
      const activeWs = workspaces.find(w => w.industry === activeIndustry);
      if (activeWs) {
        setCurrentId(activeWs.id);
      }
    }
  }, [activeIndustry, workspaces]);

  const current = workspaces.find(w => w.id === currentId) || workspaces[0];

  const getIndustryIcon = (industry: string | null) => {
    switch (industry) {
      case "RETAIL": return <Store className="h-4 w-4" />;
      case "HEAD_HUNTER": return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect width="4" height="12" x="2" y="9" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      );
      default: return <Building2 className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn("relative mb-4 px-1", collapsed ? "flex justify-center" : "")}>
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full justify-start gap-3 px-2 py-6 border border-[color:var(--line)] bg-[color:var(--surface-glass)] hover:bg-[color:var(--surface-strong)] transition-all rounded-xl shadow-sm",
          collapsed ? "w-10 h-10 p-0 justify-center rounded-xl" : ""
        )}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[image:var(--brand-gradient)] text-white shrink-0 shadow-sm">
          {getIndustryIcon(current?.industry)}
        </div>
        {!collapsed && (
          <div className="flex flex-1 flex-col items-start text-left min-w-0">
            <span className="text-sm font-bold truncate w-full text-[color:var(--foreground-strong)]">{current?.name}</span>
          </div>
        )}
        {!collapsed && <ChevronsUpDown className="h-4 w-4 text-[color:var(--foreground-muted)] opacity-50" />}
      </Button>

      {isOpen && !collapsed && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-1.5 space-y-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  setCurrentId(ws.id);
                  onWorkspaceChange?.(ws);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors",
                  ws.id === currentId ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]" : "hover:bg-[color:var(--surface-soft)] text-[color:var(--foreground)]"
                )}
              >
                <div className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md shrink-0",
                  ws.id === currentId ? "bg-[color:var(--brand-strong)] text-white" : "bg-[color:var(--surface-strong)]"
                )}>
                  {getIndustryIcon(ws.industry)}
                </div>
                <span className="flex-1 text-left truncate">{ws.name}</span>
                {ws.id === currentId && <Check className="h-4 w-4" />}
              </button>
            ))}
            
            {/* Nút thêm không gian mới đã bị loại bỏ theo yêu cầu */}
          </div>
        </div>
      )}
    </div>
  );
}
