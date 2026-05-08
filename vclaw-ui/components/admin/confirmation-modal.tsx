"use client";

import React from "react";
import { AlertTriangle, Fingerprint, Loader2, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  oldValue?: string;
  newValue?: string;
  diff?: Array<{ label: string; from: any; to: any }>;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: "warning" | "danger" | "info";
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  oldValue,
  newValue,
  diff,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  isLoading = false,
  variant = "warning",
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const variantColors = {
    warning: {
      bg: "bg-amber-500/10",
      iconBg: "bg-amber-500/10",
      icon: "text-amber-500",
      btn: "bg-amber-500 hover:bg-amber-600 text-white border-none",
    },
    danger: {
      bg: "bg-red-500/10",
      iconBg: "bg-red-500/10",
      icon: "text-red-500",
      btn: "bg-red-500 hover:bg-red-600 text-white border-none",
    },
    info: {
      bg: "bg-[color:var(--brand-soft)]",
      iconBg: "bg-[color:var(--brand-soft)]",
      icon: "text-[color:var(--brand)]",
      btn: "bg-[color:var(--brand)] hover:bg-[color:var(--brand-strong)] text-white border-none",
    },
  };

  const colors = variantColors[variant];

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-[color:var(--surface)] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[color:var(--line)] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className={`flex items-center gap-3 ${colors.icon}`}>
            <div className={`p-2 ${colors.iconBg} rounded-full`}>
              {variant === "info" ? <Info className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
            </div>
            <h3 className="text-lg font-bold text-[color:var(--foreground-strong)]">
              {title}
            </h3>
          </div>
          
          <div className="p-4 bg-[color:var(--surface-soft)] rounded-xl border border-[color:var(--line)] space-y-3">
            <p className="text-sm leading-relaxed text-[color:var(--muted)]">
              {description}
            </p>

            {(oldValue || newValue) && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-[color:var(--muted)] uppercase">Hiện tại</span>
                  <div className="px-3 py-1 rounded-lg bg-[color:var(--surface-strong)] border border-[color:var(--line)] text-xs font-semibold text-[color:var(--muted)]">
                    {oldValue || "—"}
                  </div>
                </div>
                
                <div className="pt-4">
                  <div className="h-px w-8 bg-[color:var(--line-strong)] relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-[color:var(--line-strong)]" />
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-[color:var(--brand)] uppercase">Thay đổi</span>
                  <div className={`px-3 py-1 rounded-lg border font-bold text-xs ${variant === "danger" ? "bg-red-500/10 border-red-500/20 text-red-600" : "bg-[color:var(--brand-soft)] border-[color:var(--brand-soft)] text-[color:var(--brand-strong)]"}`}>
                    {newValue || "—"}
                  </div>
                </div>
              </div>
            )}

            {diff && diff.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[color:var(--line)] space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-[color:var(--muted)] tracking-wider">
                  <Fingerprint className="h-3 w-3" />
                  Dữ liệu cập nhật
                </div>
                <div className="rounded-lg bg-[color:var(--surface)] border border-[color:var(--line)] overflow-hidden">
                  <table className="w-full text-[11px] font-mono">
                    <tbody className="divide-y divide-[color:var(--line)]">
                      {diff.map((item, idx) => (
                        <tr key={idx} className="group">
                          <td className="px-3 py-2 bg-[color:var(--surface-soft)] text-[color:var(--muted)] w-1/3 font-semibold">
                            {item.label}
                          </td>
                          <td className="px-3 py-2 flex items-center gap-2">
                            <span className="line-through opacity-50">{JSON.stringify(item.from)}</span>
                            <span className="text-[color:var(--line-strong)]">→</span>
                            <span className="text-[color:var(--brand-strong)] font-bold">{JSON.stringify(item.to)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-[color:var(--surface-soft)] border-t border-[color:var(--line)] flex justify-end gap-3">
          <Button
            variant="outline"
            className="rounded-xl px-6 h-10 border-[color:var(--line)] hover:bg-[color:var(--surface-strong)]"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            className={`rounded-xl px-6 h-10 font-bold ${colors.btn}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
