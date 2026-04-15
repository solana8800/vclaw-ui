"use client";

import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from "react";
import { isValidElement, useEffect, useId, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";

import { readThemeFromDocument } from "@/lib/theme";
import { cn } from "@/lib/utils";

// Khởi tạo mermaid một lần duy nhất ở cấp module, tránh conflict khi reinitialize
let mermaidInitialized = false;
function ensureMermaidInitialized(theme: "dark" | "default") {
  if (!mermaidInitialized) {
    mermaid.initialize({ startOnLoad: false, theme });
    mermaidInitialized = true;
  }
}

type MarkdownViewerProps = {
  content: string;
};

type MarkdownCodeProps = ComponentPropsWithoutRef<"code"> & {
  inline?: boolean;
  children?: ReactNode;
  node?: unknown;
};

type MarkdownPreProps = ComponentPropsWithoutRef<"pre"> & {
  children?: ReactNode;
  node?: unknown;
};

function getCodeBlockProps(children: ReactNode) {
  if (!isValidElement(children)) {
    return null;
  }

  const props = (children as ReactElement<MarkdownCodeProps>).props;
  // react-markdown bọc fenced block trong <pre>; child là output của `components.code`.
  // Khi override `code` bằng component React, `child.type` là function — không còn là chuỗi "code",
  // nên không được lọc theo type nữa; chỉ cần phân biệt inline vs block.
  if (props.inline) {
    return null;
  }

  return props;
}

function MermaidBlock({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  // useId() trả về chuỗi dạng ":r0:" — phải loại sạch ký tự đặc biệt để ID hợp lệ trong SVG
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9]/g, "");
  // Dùng ref để tránh render lại khi chart không đổi
  const chartRef = useRef(chart);

  useEffect(() => {
    let mounted = true;
    chartRef.current = chart;
    const theme = readThemeFromDocument() === "dark" ? "dark" : "default";
    
    // Khởi tạo mermaid đúng 1 lần, không gọi lại mỗi render
    ensureMermaidInitialized(theme);
    
    // Đặt lại trạng thái trước khi render mới
    setSvg("");
    setError("");

    mermaid
      .render(`mermaid${id}`, chart)
      .then(({ svg: renderedSvg }) => {
        if (mounted) {
          setSvg(renderedSvg);
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          // Log lỗi ra console để dễ debug khi chart bị lỗi syntax
          console.warn("[MermaidBlock] Lỗi render mermaid chart:", err);
          setError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      mounted = false;
    };
  }, [chart, id]);

  // Hiển thị lỗi rõ ràng thay vì fallback im lặng
  if (error) {
    return (
      <div className="my-4 rounded-2xl border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
        <p className="mb-2 text-xs font-semibold text-red-600 dark:text-red-400">⚠️ Lỗi render mermaid chart</p>
        <pre className="overflow-x-auto text-xs text-red-500 dark:text-red-400">{error}</pre>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-gray-500">Xem source chart</summary>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-100 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <code>{chart}</code>
          </pre>
        </details>
      </div>
    );
  }

  // Đang loading — hiển thị placeholder
  if (!svg) {
    return (
      <pre className="overflow-x-auto rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 text-sm text-[color:var(--foreground)]">
        <code>{chart}</code>
      </pre>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  return (
    <article className="vclaw-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        urlTransform={(uri: string) => {
          if (uri.startsWith("./assets/")) {
            return uri.replace("./assets/", "/docs/assets/");
          }
          return uri;
        }}
        components={{
          pre({ children }: MarkdownPreProps) {
            const codeProps = getCodeBlockProps(children);
            // react-markdown v10 đặt className trên thẻ <code> bên trong <pre>
            // className có dạng "language-mermaid" hoặc "language-xxx"
            const className = codeProps?.className ?? "";
            const code = String(codeProps?.children ?? "").replace(/\n$/, "");

            // Kiểm tra cả hai dạng: string hoặc array string (react-markdown v10 behavior)
            const classNames = Array.isArray(className)
              ? className.join(" ")
              : String(className);

            if (/language-mermaid/.test(classNames)) {
              return <MermaidBlock chart={code} />;
            }

            return (
              <pre className="my-8 overflow-x-auto rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-5 text-sm text-[color:var(--foreground)]">
                {children}
              </pre>
            );
          },
          h1({ className, ...props }) {
            return (
              <h1
                className={cn(
                  "mb-8 text-4xl font-bold tracking-tight text-[color:var(--foreground-strong)]",
                  className,
                )}
                {...props}
              />
            );
          },
          h2({ className, ...props }) {
            return (
              <h2
                className={cn(
                  "mt-14 mb-4 text-2xl font-semibold text-[color:var(--foreground-strong)]",
                  className,
                )}
                {...props}
              />
            );
          },
          h3({ className, ...props }) {
            return (
              <h3
                className={cn(
                  "mt-10 mb-3 text-xl font-semibold text-[color:var(--foreground-strong)]",
                  className,
                )}
                {...props}
              />
            );
          },
          p({ className, ...props }) {
            return (
              <p
                className={cn(
                  "mb-5 leading-8 text-[color:var(--foreground)]",
                  className,
                )}
                {...props}
              />
            );
          },
          a({ className, ...props }) {
            return (
              <a
                className={cn(
                  "font-medium text-[color:var(--brand-strong)] underline underline-offset-4 hover:text-[color:var(--brand)]",
                  className,
                )}
                {...props}
              />
            );
          },
          blockquote({ className, ...props }) {
            return (
              <blockquote
                className={cn(
                  "my-8 rounded-r-2xl border-l-4 border-[color:var(--brand)] bg-[color:var(--brand-softer)] px-5 py-4 text-[color:var(--foreground)]",
                  className,
                )}
                {...props}
              />
            );
          },
          ul({ className, ...props }) {
            return <ul className={cn("mb-5 list-disc space-y-2 pl-6", className)} {...props} />;
          },
          ol({ className, ...props }) {
            return <ol className={cn("mb-5 list-decimal space-y-2 pl-6", className)} {...props} />;
          },
          table({ className, ...props }) {
            return (
              <div className="my-8 overflow-x-auto rounded-2xl border border-[color:var(--line)]">
                <table
                  className={cn("min-w-full border-collapse bg-[color:var(--surface)]", className)}
                  {...props}
                />
              </div>
            );
          },
          thead({ className, ...props }) {
            return <thead className={cn("bg-[color:var(--surface-soft)]", className)} {...props} />;
          },
          th({ className, ...props }) {
            return (
              <th
                className={cn(
                  "px-4 py-3 text-left text-sm font-semibold text-[color:var(--foreground-strong)]",
                  className,
                )}
                {...props}
              />
            );
          },
          td({ className, ...props }) {
            return (
              <td
                className={cn(
                  "border-t border-[color:var(--line)] px-4 py-3 align-top text-sm text-[color:var(--foreground)]",
                  className,
                )}
                {...props}
              />
            );
          },
          code({ inline, className, children, ...props }: MarkdownCodeProps) {
            if (!inline) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }

            return (
              <code
                className="rounded-md bg-[color:var(--brand-softer)] px-1.5 py-0.5 text-sm text-[color:var(--brand-strong)]"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
