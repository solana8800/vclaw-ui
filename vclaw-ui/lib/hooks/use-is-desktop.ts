"use client";

import { useEffect, useState } from "react";

/**
 * Hook để kiểm tra xem ứng dụng có đang chạy trong môi trường Desktop (Electron) hay không.
 */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Kiểm tra xem có đang chạy trong Electron hay không
    const isElectron =
      typeof window !== "undefined" &&
      navigator.userAgent.toLowerCase().includes("electron");

    // Cho phép ép buộc chế độ desktop qua biến môi trường (hữu ích khi test build)
    const isForcedDesktop = process.env.NEXT_PUBLIC_IS_DESKTOP === "true";

    setIsDesktop(isElectron || isForcedDesktop);
  }, []);

  return isDesktop;
}
