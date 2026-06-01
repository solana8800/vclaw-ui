"use client";

import React, { useRef, useState } from "react";
import { FileUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminHhContent } from "@/lib/admin/content";
import { cn } from "@/lib/shared";

type CandidateCvUploadDialogProps = {
  open: boolean;
  onClose: () => void;
  messages: AdminHhContent;
  onStartBackground: (file: File) => void;
};

const ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function CandidateCvUploadDialog({
  open,
  onClose,
  messages,
  onStartBackground,
}: CandidateCvUploadDialogProps) {
  const c = messages.candidates;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  if (!open) return null;

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (inputRef.current) inputRef.current.value = "";
    onStartBackground(file);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--line)] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold">{c.cvUpload.title}</h2>
            <p className="mt-1 text-xs text-[color:var(--foreground-muted)]">
              {c.cvUpload.description}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className={cn(
              "flex min-h-72 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
              dragOver
                ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)]/40"
                : "border-[color:var(--line)] bg-[color:var(--surface-soft)] hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-soft)]/20",
            )}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              handleFile(event.dataTransfer.files?.[0] ?? null);
            }}
          >
            <FileUp className="h-12 w-12 text-[color:var(--brand-strong)]" />
            <span className="text-base font-semibold text-[color:var(--foreground-strong)]">
              {c.cvUpload.dropTitle}
            </span>
            <span className="max-w-sm text-sm text-[color:var(--foreground-muted)]">
              {c.cvUpload.dropHint}
            </span>
            <span className="text-xs font-medium text-[color:var(--brand-strong)]">
              {c.cvUpload.formatHint}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
