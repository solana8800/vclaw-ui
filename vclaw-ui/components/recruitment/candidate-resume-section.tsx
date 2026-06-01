"use client";

import React, { useEffect, useRef, useState } from "react";
import { ExternalLink, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminHhContent } from "@/lib/admin/content";
import { removeCandidateResume, uploadCandidateResume } from "@/lib/actions/recruitment/actions";
import { CandidateResumeMarkdown } from "@/components/recruitment/candidate-resume-markdown";
import { toast } from "@/lib/notifications/toast";
import { cn } from "@/lib/shared";

type CandidateResumeSectionProps = {
  candidateId: string;
  initialCvText: string;
  initialCvFileUrl?: string | null;
  messages: AdminHhContent;
  onUpdated?: () => void;
};

const ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function resumePreviewUrl(candidateId: string): string {
  return `/api/recruitment/candidates/${encodeURIComponent(candidateId)}/resume`;
}

export function CandidateResumeSection({
  candidateId,
  initialCvText,
  initialCvFileUrl,
  messages,
  onUpdated,
}: CandidateResumeSectionProps) {
  const d = messages.candidates.detail;
  const inputRef = useRef<HTMLInputElement>(null);
  const [cvText, setCvText] = useState(initialCvText);
  const [hasFile, setHasFile] = useState(Boolean(initialCvFileUrl?.trim()));
  const [fileLabel, setFileLabel] = useState<string | null>(() =>
    initialCvFileUrl ? initialCvFileUrl.split("/").pop() ?? null : null,
  );
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setCvText(initialCvText);
    setHasFile(Boolean(initialCvFileUrl?.trim()));
    setFileLabel(initialCvFileUrl ? initialCvFileUrl.split("/").pop() ?? null : null);
    setExpanded(false);
  }, [candidateId, initialCvText, initialCvFileUrl]);

  const hasParsedText = Boolean(cvText.trim());
  const canPreviewFile = hasFile;

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const res = await uploadCandidateResume(candidateId, formData);
    setUploading(false);
    if (res.success) {
      setCvText(res.cvText);
      setHasFile(true);
      setFileLabel(res.cvFileName ?? file.name);
      toast.success(d.resumeUploadSuccess);
      onUpdated?.();
    } else {
      toast.error(res.error ?? d.resumeUploadError);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = async () => {
    setRemoving(true);
    const res = await removeCandidateResume(candidateId);
    setRemoving(false);
    if (res.success) {
      setCvText("");
      setHasFile(false);
      setFileLabel(null);
      toast.success(d.resumeRemoveSuccess);
      onUpdated?.();
    } else {
      toast.error(res.error ?? d.resumeRemoveError);
    }
  };

  const handlePreview = () => {
    window.open(resumePreviewUrl(candidateId), "_blank", "noopener,noreferrer");
  };

  const preview = cvText.trim();
  const isLongMarkdown = preview.split("\n").length > 10 || preview.length > 900;

  return (
    <section
      className={cn(
        "space-y-2 relative rounded-lg transition-colors",
        dragOver && !uploading && !removing
          ? "ring-2 ring-[color:var(--brand-strong)] ring-offset-2 ring-offset-[color:var(--surface)] bg-[color:var(--brand-soft)]/30"
          : "",
      )}
      aria-labelledby="candidate-resume-heading"
      onDragOver={(e) => {
        if (uploading || removing) return;
        e.preventDefault();
        if (!dragOver) setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (uploading || removing) return;
        const file = e.dataTransfer.files?.[0] ?? null;
        if (file) void handleFile(file);
      }}
    >
      {dragOver && !uploading && !removing ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[color:var(--brand-soft)]/60 text-xs font-semibold text-[color:var(--brand-strong)]">
          <Upload className="h-4 w-4 mr-1.5" />
          {d.resumeUpload}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <h3
          id="candidate-resume-heading"
          className="text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground-muted)]"
        >
          {d.resumeTitle}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {canPreviewFile ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={uploading || removing}
              onClick={handlePreview}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              {d.resumePreview}
            </Button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            disabled={uploading || removing}
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={uploading || removing}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Upload className="h-3.5 w-3.5 mr-1.5" />
            )}
            {hasFile || hasParsedText ? d.resumeReplace : d.resumeUpload}
          </Button>
          {hasFile || hasParsedText ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-rose-700 hover:text-rose-800"
              disabled={uploading || removing}
              onClick={() => void handleRemove()}
              title={d.resumeRemove}
            >
              {removing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {fileLabel ? (
        <p className="text-[11px] text-[color:var(--foreground-muted)] flex items-center gap-1 truncate">
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{fileLabel}</span>
        </p>
      ) : null}

      {canPreviewFile ? (
        <p className="text-[10px] text-[color:var(--foreground-muted)] leading-relaxed">
          {d.resumePreviewHint}
        </p>
      ) : null}

      {hasParsedText ? (
        <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 py-2">
          <CandidateResumeMarkdown
            content={preview}
            className={expanded || !isLongMarkdown ? undefined : "max-h-48 overflow-y-auto"}
          />
          {isLongMarkdown ? (
            <button
              type="button"
              className="text-[11px] font-medium text-[color:var(--brand-strong)] mt-1.5"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? d.showLess : d.showMore}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
