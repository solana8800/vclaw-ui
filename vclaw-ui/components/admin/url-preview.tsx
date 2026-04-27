"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

interface UrlPreviewProps {
  url: string;
}

interface Metadata {
  title?: string;
  description?: string;
  image?: string;
  url: string;
}

export function UrlPreview({ url }: UrlPreviewProps) {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(false);

  // Loại bỏ các ký tự thừa ở cuối link nếu có (ví dụ dấu ngoặc trong Markdown)
  const cleanUrl = url.replace(/[)]+$/, "");
  
  const isImage = /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(cleanUrl) || 
                  cleanUrl.includes("vietqr.net") || 
                  cleanUrl.includes("img.vietqr.io") ||
                  cleanUrl.includes("images.unsplash.com");

  useEffect(() => {
    if (isImage) return;

    let cancelled = false;
    const fetchMetadata = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/vclaw/metadata?url=${encodeURIComponent(cleanUrl)}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setMetadata(data);
        }
      } catch (err) {
        console.error("Failed to fetch metadata:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchMetadata();
    return () => { cancelled = true; };
  }, [cleanUrl, isImage]);

  if (isImage) {
    return (
      <div className="mt-2 overflow-hidden rounded-xl border border-[color:var(--line-strong)] bg-white shadow-sm transition-all hover:shadow-md">
        <img 
          src={cleanUrl} 
          alt="Preview" 
          className="max-h-[300px] w-full object-contain cursor-zoom-in"
          loading="lazy"
          onClick={() => window.open(cleanUrl, "_blank")}
          onError={(e) => {
            (e.target as HTMLImageElement).parentElement!.style.display = 'none';
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] p-3">
        <Loader2 className="h-4 w-4 animate-spin text-[color:var(--muted)]" />
        <span className="text-[10px] text-[color:var(--muted)] italic">Đang tải bản xem trước...</span>
      </div>
    );
  }

  // Premium Link Card for non-image URLs or rich metadata
  try {
    const urlObj = new URL(cleanUrl);
    const domain = urlObj.hostname;
    
    return (
      <a 
        href={cleanUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="mt-2 flex flex-col overflow-hidden rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-glass)] transition hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-softer)] group"
      >
        {metadata?.image && (
          <div className="aspect-video w-full overflow-hidden border-b border-[color:var(--line)]">
            <img src={metadata.image} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
          </div>
        )}
        <div className="flex items-center gap-3 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--brand-softer)] text-[color:var(--brand)] group-hover:scale-110 transition-transform">
            <ExternalLink className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-[color:var(--foreground-strong)]">
              {metadata?.title || domain}
            </div>
            {metadata?.description && (
              <div className="line-clamp-1 text-[10px] text-[color:var(--muted)]">
                {metadata.description}
              </div>
            )}
            <div className="truncate text-[10px] text-[color:var(--brand)] opacity-70">
              {domain}
            </div>
          </div>
        </div>
      </a>
    );
  } catch {
    return null;
  }
}
