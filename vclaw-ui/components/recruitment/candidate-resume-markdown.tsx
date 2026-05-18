"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/shared";

type CandidateResumeMarkdownProps = {
  content: string;
  className?: string;
};

/** Render markdown CV trong sheet chi tiết — gọn, đọc được heading/list. */
export function CandidateResumeMarkdown({ content, className }: CandidateResumeMarkdownProps) {
  if (!content.trim()) return null;

  return (
    <div
      className={cn(
        "candidate-resume-markdown text-[color:var(--foreground)]",
        "[&_h1]:text-sm [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h1]:text-[color:var(--brand-strong)]",
        "[&_h2]:text-xs [&_h2]:font-bold [&_h2]:mt-2.5 [&_h2]:mb-1 [&_h2]:text-[color:var(--foreground-strong)]",
        "[&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1",
        "[&_p]:text-xs [&_p]:leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0",
        "[&_ul]:text-xs [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_ul]:space-y-1",
        "[&_ol]:text-xs [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2 [&_ol]:space-y-1",
        "[&_li]:leading-relaxed",
        "[&_strong]:font-semibold [&_strong]:text-[color:var(--foreground-strong)]",
        "[&_a]:text-[color:var(--brand-strong)] [&_a]:underline [&_a]:underline-offset-2",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-[color:var(--brand)] [&_blockquote]:pl-2.5 [&_blockquote]:my-2 [&_blockquote]:text-[color:var(--foreground-muted)] [&_blockquote]:italic",
        "[&_code]:rounded [&_code]:bg-[color:var(--surface)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[11px]",
        "[&_pre]:hidden [&_img]:hidden",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: () => null,
          h1: ({ children }) => <h4 className="!mt-0">{children}</h4>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
