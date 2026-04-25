"use client";

import type {
  ComponentPropsWithoutRef,
  PointerEvent as DiagramPointerEvent,
  ReactElement,
  ReactNode,
} from "react";
import {
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";

import { readThemeFromDocument, themeChangeEventName } from "@/lib/ui";
import { cn } from "@/lib/shared";

export type MermaidToolbarLabels = {
  zoomIn: string;
  zoomOut: string;
  resetZoom: string;
  wheelHint: string;
  dragHint: string;
};

// Khởi tạo mermaid tối thiểu một lần; màu nền theo theme VClaw truyền qua %%{init}%% trên từng chart.
let mermaidInitialized = false;
function ensureMermaidInitialized() {
  if (!mermaidInitialized) {
    mermaid.initialize({ startOnLoad: false });
    mermaidInitialized = true;
  }
}

function subscribeTheme(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(themeChangeEventName, onStoreChange);
  return () => window.removeEventListener(themeChangeEventName, onStoreChange);
}

function getThemeIsDarkSnapshot() {
  if (typeof document === "undefined") {
    return false;
  }
  return readThemeFromDocument() === "dark";
}

/** Ánh xạ themeVariables Mermaid ↔ biến trong `app/globals.css` (html.light / html.dark). */
const MERMAID_CSS_VAR_KEYS: Record<string, string> = {
  background: "--mermaid-canvas",
  primaryColor: "--mermaid-primary-fill",
  primaryTextColor: "--mermaid-primary-text",
  primaryBorderColor: "--mermaid-primary-border",
  secondaryColor: "--mermaid-secondary-fill",
  secondaryTextColor: "--mermaid-secondary-text",
  secondaryBorderColor: "--mermaid-secondary-border",
  tertiaryColor: "--mermaid-tertiary-fill",
  tertiaryTextColor: "--mermaid-tertiary-text",
  tertiaryBorderColor: "--mermaid-tertiary-border",
  lineColor: "--mermaid-line",
  textColor: "--mermaid-text",
  titleColor: "--mermaid-title",
  clusterBkg: "--mermaid-cluster-bkg",
  clusterBorder: "--mermaid-cluster-border",
  clusterTextColor: "--mermaid-cluster-text",
  edgeLabelBackground: "--mermaid-edge-label-bg",
  mainBkg: "--mermaid-main-bkg",
  actorBkg: "--mermaid-actor-bkg",
  actorBorder: "--mermaid-actor-border",
  actorTextColor: "--mermaid-actor-text",
  signalColor: "--mermaid-signal",
  labelTextColor: "--mermaid-label-text",
};

function readMermaidThemeVariablesFromCss(): Record<string, string> {
  if (typeof document === "undefined") {
    return {};
  }
  const cs = getComputedStyle(document.documentElement);
  const themeVariables: Record<string, string> = {};
  for (const [apiKey, cssVar] of Object.entries(MERMAID_CSS_VAR_KEYS)) {
    const raw = cs.getPropertyValue(cssVar).trim();
    if (raw) {
      themeVariables[apiKey] = raw;
    }
  }
  return themeVariables;
}

function buildVclawMermaidSource(chart: string): string {
  const themeVariables = readMermaidThemeVariablesFromCss();
  const init = { theme: "base" as const, themeVariables };
  return `%%{init: ${JSON.stringify(init)}}%%\n${chart}`;
}

type MarkdownViewerProps = {
  content: string;
  mermaidToolbar: MermaidToolbarLabels;
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

/** react-markdown đôi khi truyền `children` dạng mảng; `String(...)` sẽ làm mất xuống dòng. */
function codeChildrenToPlainText(children: ReactNode): string {
  if (children == null || typeof children === "boolean") {
    return "";
  }
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(codeChildrenToPlainText).join("");
  }
  if (isValidElement(children)) {
    return codeChildrenToPlainText(
      (children as ReactElement<{ children?: ReactNode }>).props.children,
    );
  }
  return "";
}

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

const ZOOM_MIN = 0.45;
const ZOOM_MAX = 2.75;
const ZOOM_STEP = 0.12;

function clampZoom(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
}

function chartDigest(chart: string): string {
  let h = 2166136261;
  for (let i = 0; i < chart.length; i++) {
    h ^= chart.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${(h >>> 0).toString(36)}:${chart.length}`;
}

function MermaidChartSurface({
  chart,
  toolbar,
}: {
  chart: string;
  toolbar: MermaidToolbarLabels;
}) {
  const isDark = useSyncExternalStore(
    subscribeTheme,
    getThemeIsDarkSnapshot,
    () => false,
  );
  return (
    <MermaidBlockImpl
      key={`${isDark ? "dark" : "light"}-${chartDigest(chart)}`}
      chart={chart}
      toolbar={toolbar}
    />
  );
}

/** Mermaid hay xuất width="100%"; gộp viewBox, thuộc tính kích thước và getBBox để vùng cuộn đủ rộng. */
function readMermaidSvgLogicalSize(svgEl: SVGSVGElement): { w: number; h: number } {
  let w = 0;
  let h = 0;
  const vb = svgEl.viewBox?.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) {
    w = vb.width;
    h = vb.height;
  }
  const wAttr = svgEl.getAttribute("width");
  const hAttr = svgEl.getAttribute("height");
  if (wAttr && !/%/.test(wAttr)) {
    const parsed = parseFloat(wAttr);
    if (parsed > 0) {
      w = Math.max(w, parsed);
    }
  }
  if (hAttr && !/%/.test(hAttr)) {
    const parsed = parseFloat(hAttr);
    if (parsed > 0) {
      h = Math.max(h, parsed);
    }
  }
  try {
    const box = svgEl.getBBox();
    if (box.width > 0 && box.height > 0) {
      w = Math.max(w, box.width);
      h = Math.max(h, box.height);
    }
  } catch {
    /* jsdom / SVG chưa gắn layout */
  }
  if (w > 0 && h > 0) {
    return { w, h };
  }
  const cw = svgEl.clientWidth;
  const ch = svgEl.clientHeight;
  if (cw > 0 && ch > 0) {
    return { w: cw, h: ch };
  }
  return { w: 960, h: 540 };
}

function centerMermaidViewportScroll(vp: HTMLDivElement) {
  const maxL = Math.max(0, vp.scrollWidth - vp.clientWidth);
  const maxT = Math.max(0, vp.scrollHeight - vp.clientHeight);
  vp.scrollLeft = maxL / 2;
  vp.scrollTop = maxT / 2;
}

function MermaidBlockImpl({
  chart,
  toolbar,
}: {
  chart: string;
  toolbar: MermaidToolbarLabels;
}) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  const [size, setSize] = useState({ w: 640, h: 420 });
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9]/g, "");
  const contentRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragSessionRef = useRef<{
    pointerId: number;
    originX: number;
    originY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const scrollFitKeyRef = useRef("");

  /** Kích thước vùng cuộn = khung sau scale; lớp bọc overflow:hidden tránh hộp layout SVG (size.w) làm lệch scrollWidth khi zoom < 1. */
  const contentW = size.w * zoom;
  const contentH = size.h * zoom;
  const scrollPad = 6;
  /** Lề thêm quanh biểu đồ để luôn kéo được cả dọc/ngang khi zoom nhỏ (nội dung thấp hơn khung viewport). */
  const PAN_MARGIN = 96;

  useEffect(() => {
    let mounted = true;
    ensureMermaidInitialized();

    const source = buildVclawMermaidSource(chart);

    mermaid
      .render(`mermaid${id}`, source)
      .then(({ svg: renderedSvg }) => {
        if (mounted) {
          setSvg(renderedSvg);
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          console.warn("[MermaidBlock] Lỗi render mermaid chart:", err);
          setError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      mounted = false;
    };
  }, [chart, id]);

  useEffect(() => {
    scrollFitKeyRef.current = "";
  }, [svg]);

  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!svg || !vp || typeof ResizeObserver === "undefined") {
      return;
    }
    const sync = () => {
      const el = viewportRef.current;
      if (!el) {
        return;
      }
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      if (w < 1 || h < 1) {
        return;
      }
      setViewportSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    sync();
    const ro = new ResizeObserver(() => {
      sync();
    });
    ro.observe(vp);
    return () => {
      ro.disconnect();
    };
  }, [svg]);

  useLayoutEffect(() => {
    if (!svg) {
      return;
    }
    const root = contentRef.current;
    if (!root) {
      return;
    }
    const svgEl = root.querySelector("svg");
    if (!svgEl) {
      return;
    }

    let { w, h } = readMermaidSvgLogicalSize(svgEl);
    if (w < 64) {
      w = 320;
    }
    if (h < 32) {
      h = 200;
    }
    const next = { w, h };
    const raf = requestAnimationFrame(() => {
      setSize(next);
    });
    return () => cancelAnimationFrame(raf);
  }, [svg]);

  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!svg || !vp || size.w < 16) {
      return;
    }
    const fitKey = `${size.w}x${size.h}@${zoom.toFixed(4)}`;
    if (scrollFitKeyRef.current === fitKey) {
      return;
    }
    scrollFitKeyRef.current = fitKey;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const box = viewportRef.current;
        if (!box) {
          return;
        }
        if (box.scrollWidth > box.clientWidth + 1 || box.scrollHeight > box.clientHeight + 1) {
          centerMermaidViewportScroll(box);
        }
      });
    });
  }, [svg, size.w, size.h, zoom]);

  const endDragSession = useCallback(() => {
    dragSessionRef.current = null;
    setIsDragging(false);
  }, []);

  const onViewportPointerDown = useCallback((e: DiagramPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) {
      return;
    }
    const vp = viewportRef.current;
    if (!vp) {
      return;
    }
    if (vp.scrollWidth <= vp.clientWidth + 1 && vp.scrollHeight <= vp.clientHeight + 1) {
      return;
    }
    vp.setPointerCapture(e.pointerId);
    dragSessionRef.current = {
      pointerId: e.pointerId,
      originX: e.clientX,
      originY: e.clientY,
      scrollLeft: vp.scrollLeft,
      scrollTop: vp.scrollTop,
    };
    setIsDragging(true);
  }, []);

  const onViewportPointerMove = useCallback((e: DiagramPointerEvent<HTMLDivElement>) => {
    const session = dragSessionRef.current;
    if (!session || e.pointerId !== session.pointerId) {
      return;
    }
    const vp = viewportRef.current;
    if (!vp) {
      return;
    }
    e.preventDefault();
    const dx = e.clientX - session.originX;
    const dy = e.clientY - session.originY;
    const maxL = Math.max(0, vp.scrollWidth - vp.clientWidth);
    const maxT = Math.max(0, vp.scrollHeight - vp.clientHeight);
    vp.scrollLeft = Math.min(maxL, Math.max(0, session.scrollLeft - dx));
    vp.scrollTop = Math.min(maxT, Math.max(0, session.scrollTop - dy));
  }, []);

  const onViewportPointerUp = useCallback((e: DiagramPointerEvent<HTMLDivElement>) => {
    const session = dragSessionRef.current;
    if (session && e.pointerId === session.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* đã release */
      }
      endDragSession();
    }
  }, [endDragSession]);

  const resetView = useCallback(() => {
    setZoom(1);
    scrollFitKeyRef.current = "";
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        const vp = viewportRef.current;
        if (vp) {
          centerMermaidViewportScroll(vp);
        }
      });
    });
  }, []);

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

  if (!svg) {
    return (
      <pre className="overflow-x-auto rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 text-sm text-[color:var(--foreground)]">
        <code>{chart}</code>
      </pre>
    );
  }

  const clipW = Math.max(1, Math.ceil(contentW) + scrollPad);
  const clipH = Math.max(1, Math.ceil(contentH) + scrollPad);
  const vpW = viewportSize.w > 0 ? viewportSize.w : clipW;
  const vpH = viewportSize.h > 0 ? viewportSize.h : clipH;
  const scrollSurfaceW = Math.max(clipW, vpW) + 2 * PAN_MARGIN;
  const scrollSurfaceH = Math.max(clipH, vpH) + 2 * PAN_MARGIN;
  const clipLeft = (scrollSurfaceW - clipW) / 2;
  const clipTop = (scrollSurfaceH - clipH) / 2;

  return (
    <figure className="my-6 w-full min-w-0 max-w-none rounded-2xl border border-[color:var(--line)] bg-transparent p-3">
      <figcaption className="mb-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-0.5">
            <button
              type="button"
              className="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-semibold text-[color:var(--foreground-strong)] transition hover:bg-[color:var(--brand-softer)] hover:text-[color:var(--brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]"
              aria-label={toolbar.zoomOut}
              title={toolbar.zoomOut}
              onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
            >
              −
            </button>
            <button
              type="button"
              className="inline-flex h-8 min-w-[3.25rem] items-center justify-center rounded-full px-2 text-xs font-medium tabular-nums text-[color:var(--muted)]"
              aria-label={toolbar.resetZoom}
              title={toolbar.resetZoom}
              onClick={resetView}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              className="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-semibold text-[color:var(--foreground-strong)] transition hover:bg-[color:var(--brand-softer)] hover:text-[color:var(--brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]"
              aria-label={toolbar.zoomIn}
              title={toolbar.zoomIn}
              onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
            >
              +
            </button>
          </div>
          <span className="text-xs text-[color:var(--muted)]">{toolbar.wheelHint}</span>
        </div>
        <span className="text-xs text-[color:var(--muted)]">{toolbar.dragHint}</span>
      </figcaption>
      <div
        ref={viewportRef}
        className={cn(
          "vclaw-mermaid-viewport-scroll w-full min-w-0 min-h-[280px] max-h-[min(72vh,720px)] overflow-x-auto overflow-y-auto overscroll-contain rounded-xl",
          "select-none [touch-action:none]",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
        onPointerDown={onViewportPointerDown}
        onPointerMove={onViewportPointerMove}
        onPointerUp={onViewportPointerUp}
        onPointerCancel={onViewportPointerUp}
        onLostPointerCapture={endDragSession}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
            setZoom((z) => clampZoom(z + delta));
          }
        }}
      >
        <div
          className="relative block max-w-none shrink-0"
          style={{
            width: scrollSurfaceW,
            height: scrollSurfaceH,
          }}
        >
          <div
            className="absolute overflow-hidden"
            style={{
              left: clipLeft,
              top: clipTop,
              width: clipW,
              height: clipH,
            }}
          >
            <div
              ref={contentRef}
              className="absolute left-0 top-0 [&_svg]:block [&_svg]:h-full [&_svg]:w-full [&_svg]:max-h-none [&_svg]:max-w-none"
              style={{
                width: size.w,
                height: size.h,
                transform: `scale(${zoom})`,
                transformOrigin: "0 0",
              }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </div>
      </div>
    </figure>
  );
}

export function MarkdownViewer({ content, mermaidToolbar }: MarkdownViewerProps) {
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
            const className = codeProps?.className ?? "";
            const code = codeChildrenToPlainText(codeProps?.children).replace(/\n$/, "");

            const classNames = Array.isArray(className)
              ? className.join(" ")
              : String(className);

            if (/language-mermaid/.test(classNames)) {
              return <MermaidChartSurface chart={code} toolbar={mermaidToolbar} />;
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
