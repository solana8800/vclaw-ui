"use client";

import { useEffect } from "react";

/**
 * Root-level error UI when the root layout throws. Keeps desktop users from a dead-end
 * (minimal chrome): Retry re-renders the segment; Home navigates to `/`.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[vclaw] global-error:", error);
  }, [error]);

  const vi = typeof navigator !== "undefined" && /^vi\b/i.test(navigator.language || "");

  return (
    <html lang={vi ? "vi" : "en"}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          background: "#0a0a0a",
          color: "#fafafa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            background: "#171717",
            border: "1px solid #2e2e2e",
            borderRadius: 16,
            padding: "28px 24px",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", margin: "0 0 12px" }}>
            {vi ? "Đã xảy ra lỗi" : "Something went wrong"}
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#a3a3a3", margin: "0 0 20px", lineHeight: 1.5 }}>
            {vi
              ? "Ứng dụng không tải được. Bạn có thể thử lại hoặc về màn hình chính. Trên bản cài macOS, dùng menu Điều hướng hoặc Thoát (Cmd+Q)."
              : "The app hit an unexpected error. Try again or go home. On the macOS desktop build, use the Navigate menu or Quit (Cmd+Q)."}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                cursor: "pointer",
                border: "none",
                borderRadius: 10,
                padding: "10px 16px",
                fontSize: "0.875rem",
                fontWeight: 600,
                background: "#e11d48",
                color: "#fff",
              }}
            >
              {vi ? "Thử lại" : "Try again"}
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              style={{
                cursor: "pointer",
                border: "1px solid #404040",
                borderRadius: 10,
                padding: "10px 16px",
                fontSize: "0.875rem",
                fontWeight: 600,
                background: "#262626",
                color: "#fafafa",
              }}
            >
              {vi ? "Về màn hình chính" : "Home"}
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
